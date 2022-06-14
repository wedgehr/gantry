const { config } = require('./config');
const Client = require('./lib/Client');
const Gantry = require('./lib/Gantry');
const Server = require('./lib/Server');

const docker = new Client({
	host: config.engine.host,
	socket: config.engine.socket,
})

const gantry = new Gantry({
	docker,
	config,
});

const server = new Server({
	port: config.server.port,
	requestLogging: config.server.enableLogging,
	tokens: config.server.authTokens,
});

server.protected.get('/services', async (req, res) => {
	res.json(
		await gantry.listServices()
	);
});

server.protected.post('/deploy', async (req, res) => {
	const { group, version } = req.body;

	if (!group || !version) {
		res.status(400)
			.json({
				error: true,
			});

		return;
	}

	await gantry.deploy({ group, version })

	res.json({
		success: true
	})
})

server.boot();
