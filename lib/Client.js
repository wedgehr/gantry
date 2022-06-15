const Docker = require("dockerode");

class Client {
	constructor({ host, socket }) {
		this.host = host;
		this.socket = socket;

		if (!this.host && !this.socket) {
			console.error('cannot create docker client: neither host nor socket provided');
			process.exit(1);
		}

		this.client = this.createClient();
		this.checkConnection();
	}

	get engine() {
		return this.client;
	}

	createClient() {
		if (this.socket) {
			return new Docker({ socketPath: this.socket });
		}

		let host = this.host;
		if (host.indexOf('http') !== 0) {
			// add http:// prefix if not provided
			host = 'http://' + host;
		}

		const url = new URL(host);
		return new Docker({
			host: url.hostname,
			port: url.port,
		});
	}

	checkConnection() {
		// ping docker engine to ensure connectivity
		this.client.ping().then(x => {
			console.log('successfully connected to docker engine');
		}).catch(e => {
			console.error('ping error', e);
			process.exit(1);
		})
	}
}

module.exports = Client;
