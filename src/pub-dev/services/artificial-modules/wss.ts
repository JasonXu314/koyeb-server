import { IncomingMessage, Server } from 'http';
import { Duplex } from 'stream';
import { parse } from 'url';
import * as ws from 'ws';

export class WSModule {
	private _wss: ws.Server | null = null;
	private _server: Server | null = null;

	constructor(serverPromise: Promise<Server>, private _path: string) {
		serverPromise.then((server) => {
			this._server = server;
		});
	}

	private _httpListener(req: IncomingMessage, sock: Duplex, head: Buffer): void {
		const { pathname } = parse(req.url!);

		if (pathname === `pub-dev/${this._path}`) {
			this._wss.handleUpgrade(req, sock, head, (client) => {
				this._wss.emit('connection', client, req);
			});
		}
	}

	public hasServer(): boolean {
		return this._wss !== null;
	}

	public createServer(): void {
		this._wss = new ws.Server({ noServer: true });

		this._server.on('upgrade', this._httpListener);
	}

	public closeServer(): void {
		this._server.removeListener('upgrade', this._httpListener);
		this._wss.close();
		this._wss = null;
	}

	public on(event: 'connection', listener: (socket: ws.WebSocket, request: IncomingMessage) => void): this;
	public on(event: 'error', listener: (error: Error) => void): this;
	public on(event: 'headers', listener: (headers: string[], request: IncomingMessage) => void): this;
	public on(event: 'close' | 'listening', listener: () => void): this;
	public on(event: string, listener: (...args: any[]) => void): this {
		this._wss.on(event, listener);
		return this;
	}

	public public() {
		return {
			hasServer: this.hasServer,
			broadcast: (message: string) => {
				this._wss.clients.forEach((client) => {
					client.send(message);
				});
			},
			clients: () => this._wss.clients
		};
	}

	public static getPath(wsModule: WSModule): string {
		return wsModule._path;
	}
}
