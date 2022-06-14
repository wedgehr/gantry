const morgan = require('morgan');
const express = require('express');


class Server {
	constructor({ port, requestLogging, tokens }) {
		this.server = null;
		this.port = port ?? 80;
		this.requestLogging = requestLogging;
		this.tokens = tokens;

		this.guard = express.Router();
		this.express = this.createApp();
	}

	get app() {
		return this.express;
	}

	get protected() {
		return this.guard;
	}

	createApp() {
		const app = express();
		app.use(express.json());

		if (this.requestLogging) {
			app.use(morgan('tiny'));
		}

		this.guard.use((req, res, next) => {
			if (!this.authCheck(req)) return next('router')
			next()
		})

		// Basic route to make sure the app is running
		app.get('/_ping', (req, res) => {
			res.send('pong');
		});

		// use the router and 401 anything falling through
		app.use('/', this.guard, (req, res) => {
			res.sendStatus(401)
		})

		return app;
	}

	boot() {
		this.server = this.express.listen(
			this.port,
			() => {
				console.log(`gantry is listening on port ${this.port}`);
			});
	}

	authCheck(req) {
		const token = req.headers['authorization'] ?? null;
		if (!token) {
			return;
		}

		return this.tokens.indexOf(
			token.replace(/^[Bb]earer /, '')
		) !== -1;
	}
}

module.exports = Server;
