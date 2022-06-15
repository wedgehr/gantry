const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);

class Gantry {
	constructor({ docker, config }) {
		this.docker = docker;
		this.engine = docker.engine;
		this.config = config;

		this.tokenResolveQueue = {};
	}

	async listServices() {
		const services = await this.engine.listServices();

		return services.map(s => ({
			ID: s.ID,
			Name: s.Spec.Name,
			Version: s.Version.Index,
			UpdateStatus: s.UpdateStatus,
		}))
	}

	shouldDeploy({ group, service }) {
		const serviceGroup = service.Spec.Labels[this.config.groupLabel] ?? null;

		if (!serviceGroup || serviceGroup !== group) {
			return false;
		}

		return true;
	}

	async deploy({ group, version }) {
		console.log('starting deployment', {
			group, version,
		});

		const services = (await this.engine.listServices())
			.filter(service => this.shouldDeploy({ group, service }));

		services.forEach(async service => {
			await this.updateServiceVersion({ service: service.ID, version })
		});
	}

	async updateServiceVersion({ service: sID, version }) {
		const $s = this.engine.getService(sID);
		const s = await $s.inspect();

		console.log("updating service", { ID: s.ID, Name: s.Spec.Name, Version: version });

		const replaceVersion = (o, prop) => {
			if (o[prop] === undefined) return;

			const atIndex = o[prop].indexOf('@');
			if (atIndex !== -1) {
				o[prop] = o[prop].substr(0, atIndex)
			}

			const parts = o[prop].split(':');
			parts[1] = version;

			o[prop] = parts.join(':');
		}

		replaceVersion(s.Spec.TaskTemplate.ContainerSpec, 'Image');
		replaceVersion(s.Spec.Labels, 'com.docker.stack.image');

		console.log("using new container image version", {
			ID: s.ID,
			Image: s.Spec.TaskTemplate.ContainerSpec.Image,
		})

		// filter out envs we are to replace, if set
		const env = s.Spec.TaskTemplate.ContainerSpec.Env
			?.filter(e =>
				this.config.replace.env.find(replacement =>
					e.indexOf(replacement + '=') === 0
				) === undefined
			)

		// add replaced envs
		this.config.replace.env.forEach(
			e => env.push(e + '="' + version + '"')
		);

		s.Spec.TaskTemplate.ContainerSpec.Env = env;

		const authconfig = await this.getAuthConfig(s.Spec.TaskTemplate.ContainerSpec.Image);
		const ret = await $s.update({ authconfig, ...s.Spec, version: s.Version.Index, });

		if (ret.Warnings) {
			console.warn('received service update warnings', {
				ID: s.ID,
				Warnings: ret.Warnings,
			});

			throw new Error('received service update warnings');
		}

		console.log("updated service", { ID: s.ID, Name: s.Spec.Name, Version: version });
	}

	getAuthConfig(image) {
		return new Promise((resolve, reject) => {
			if (this.config.registry.password) {
				return {
					username: this.config.registry.username,
					password: this.config.registry.password,
				};
			}

			const registry =
				image.indexOf('/') === -1
					? 'hub.docker.com'
					: image.split('/')[0];

			let helper = this.config.registry.credHelpers[registry] ?? '';
			helper = helper.replace(/[^0-9A-Za-z\-]/g, '');

			if (!helper.length) {
				return undefined;
			}

			this.resolveToken(registry, helper, resolve, reject);
		})
	}

	async resolveToken(registry, helper, resolve, reject) {
		const key = `${registry}:${helper}`;

		if (this.tokenResolveQueue[key] === undefined) {
			this.tokenResolveQueue[key] = [{ resolve, reject }];
		} else {
			this.tokenResolveQueue[key].push({ resolve, reject });
			return;
		}

		const done = (which, token) => {
			this.tokenResolveQueue[key].forEach(sub => sub[which](token));
			delete this.tokenResolveQueue[key];
		}

		try {
			const cmd = `echo "${registry}" | docker-credential-${helper} get`;
			const { stdout, stderr } = await exec(cmd);

			if (!!stderr) {
				console.error('dockerCredHelper error', stderr);
				return undefined;
			}

			const token = JSON.parse(stdout);
			done('resolve', {
				username: token.Username,
				password: token.Secret,
			});
		} catch (error) {
			console.error('docker credhelper error', error);
			done('reject');
		}
	}
}

module.exports = Gantry;
