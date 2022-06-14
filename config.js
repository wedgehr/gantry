const path = require('path');

require('dotenv').config({
	path: process.env.ENV_FILE !== undefined
		? process.env.ENV_FILE
		: path.resolve(process.cwd(), '.env')
})

const config = {
	engine: {
		// either host or socket are required to connect to docker engine
		host: process.env.GANTRY_DOCKER_HOST,
		socket: process.env.GANTRY_DOCKER_SOCKET,
	},

	// container label identifying service group
	groupLabel: process.env.GANTRY_GROUP_LABEL || 'com.wedgehr.gantry.group',

	//  list of service groups we are allowed to target
	groups: process.env.GANTRY_GROUPS !== undefined
		? process.env.GANTRY_GROUPS.split(',')
		: [],

	replace: {
		env: process.env.GANTRY_REPLACE_ENVS !== undefined
			? process.env.GANTRY_REPLACE_ENVS.split(',')
			: [],
	},

	server: {
		port: process.env.PORT,
		enableLogging: !!process.env.GANTRY_SERVER_LOGGING,
		authTokens: process.env.GANTRY_SERVER_TOKENS !== undefined
			? process.env.GANTRY_SERVER_TOKENS.split(',')
			: [],
	},

	registry: {
		credHelpers: process.env.GANTRY_REGISTRY_CRED_HELPERS !== undefined
			? Object.fromEntries(process.env.GANTRY_REGISTRY_CRED_HELPERS.split(',').map(s => s.split(':')))
			: [],

		username: process.env.GANTRY_REGISTRY_USERNAME,
		password: process.env.GANTRY_REGISTRY_PASSWORD,
	},
};

module.exports = { config };
