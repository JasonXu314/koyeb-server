const ws = require('ws');

class WSModule {
	constructor(server, path) {
		this.wss = null;
		this.server = server;
		this.path = path;
	}

	hasServer = () => !!this.wss;

	public = () => {
		return {
			createServer: () => {
				this.wss = new ws.Server({ server: this.server, path: this.path });
			},
			closeServer: () => {
				this.wss.close();
			},
			hasServer: this.hasServer,
			broadcast: (message) => {
				this.wss.clients.forEach((client) => {
					client.send(message);
				});
			}
		};
	};
}

module.exports = {
	WSModule
};
