import { Injectable, InternalServerErrorException, MethodNotAllowedException, NotFoundException, StreamableFile } from '@nestjs/common';
import { createContext, Script } from 'node:vm';
import * as ws from 'ws';
import { EndpointResponse } from '../interceptors/endpoint.interceptor';
import { transformMethod } from '../utils';
import { EndpointDBService } from './endpoint-db.service';
import { Directory, FilesystemService } from './filesystem.service';
import { WSSService } from './websocket-server.service';

type Req<T> = {
	query: Record<string, string>;
	body: T;
};

type RESTEndpointHandlers<T> = Partial<{
	get: (req: Req<T>) => EndpointResponse;
	post: (req: Req<T>) => EndpointResponse;
	put: (req: Req<T>) => EndpointResponse;
	del: (req: Req<T>) => EndpointResponse;
	patch: (req: Req<T>) => EndpointResponse;
	setup: () => void;
	cleanup: () => void;
}>;

type WSGatewayHandlers = {
	setup?: () => void;
	cleanup?: () => void;
	onConnection?: (socket: ws.WebSocket) => void;
	onMessage: (socket: ws.WebSocket, data: string) => void;
	onDisconnect?: (socket: ws.WebSocket, reason: string) => void;
};

@Injectable()
export class EndpointService {
	private _executionContexts: Map<string, any> = new Map();

	constructor(private fsService: FilesystemService, private dbService: EndpointDBService, private wssService: WSSService) {}

	public async evaluateRequest<T>(
		workspace: string,
		path: string,
		method: string,
		query: Record<string, string>,
		body: T
	): Promise<string | EndpointResponse | StreamableFile> {
		if (method === 'GET' && this.fsService.isRoute(workspace, `${path}.html`)) {
			return this.fsService.readRoute(workspace, `${path}.html`);
		} else if (method === 'GET' && this.fsService.isRoute(workspace, `${path}/index.html`)) {
			return this.fsService.readRoute(workspace, `${path}/index.html`);
		} else if (this.fsService.isRoute(workspace, `${path}.js`)) {
			return this._evaluateAPIEndpoint<T>(workspace, `${path}.js`, method, query, body);
		} else if (this.fsService.isRoute(workspace, `${path}/index.js`)) {
			return this._evaluateAPIEndpoint<T>(workspace, `${path}/index.js`, method, query, body);
		} else if (this.fsService.isStaticResource(workspace, path)) {
			return this.fsService.readStaticResource(workspace, path);
		} else {
			throw new NotFoundException('Page does not exist');
		}
	}

	public cleanupEndpoint(workspace: string, path: string): void {
		const module = this._evaluateModule<void>(workspace, path);

		if (module && EndpointService.isGateway(module)) {
			const wsModule = this.wssService.getWSModule(workspace);

			if (wsModule.hasServer()) {
				wsModule.closeServer();
			}
		}

		if (module && module.cleanup) {
			module.cleanup();
		}
	}

	public setupEndpoint(workspace: string, path: string): void {
		const module = this._evaluateModule<void>(workspace, path);

		if (module && EndpointService.isGateway(module)) {
			const wsModule = this.wssService.getWSModule(workspace);

			wsModule.createServer();

			wsModule.on('connection', (socket) => {
				if (module.onConnection) {
					module.onConnection(socket);
				}

				socket.on('message', (data) => {
					let msg = '';

					if (Array.isArray(data)) {
						data.forEach((chunk) => {
							msg += chunk.toString();
						});
					} else {
						msg = data.toString();
					}

					module.onMessage(socket, msg);
				});

				if (module.onDisconnect) {
					socket.on('close', (_, reason) => {
						module.onDisconnect(socket, reason.toString());
					});
				}
			});
		}

		if (module && module.setup) {
			module.setup();
		}
	}

	public setupEndpoints(workspaces: string[]): void {
		workspaces.forEach((workspace) => {
			const dir = this.fsService.indexWorkspace(workspace);
			const routesDir = dir.dirs.find((d) => d.name === 'routes');

			if (routesDir) {
				this._setupEndpoints(workspace, routesDir, []);
			}
		});
	}

	private _setupEndpoints(workspace: string, dir: Directory, prevPath: string[]): void {
		dir.files.forEach((file) => {
			if (file.endsWith('.js')) {
				try {
					this.setupEndpoint(workspace, prevPath.concat(file).join('/'));
				} catch (_) {}
			}
		});

		dir.dirs.forEach((subDir) => {
			this._setupEndpoints(workspace, subDir, prevPath.concat(subDir.name));
		});
	}

	private _evaluateAPIEndpoint<T>(workspace: string, path: string, method: string, query: Record<string, string>, body: T): EndpointResponse {
		const module = this._evaluateModule<T>(workspace, path);

		if (EndpointService.isGateway(module)) {
			throw new MethodNotAllowedException('This endpoint is a websocket gateway');
		}

		if (!module[transformMethod(method)]) {
			throw new MethodNotAllowedException(`${method} not allowed for ${path}`);
		} else {
			return module[transformMethod(method)]({ query, body });
		}
	}

	private _evaluateModule<T>(workspace: string, path: string): RESTEndpointHandlers<T> | WSGatewayHandlers {
		if (!this._executionContexts.has(workspace)) {
			this._executionContexts.set(workspace, {});
		}

		const context = this._executionContexts.get(workspace);

		const ctx = createContext({
			module: {},
			context,
			Number,
			String,
			Boolean,
			require: (module: string) => {
				if (typeof module !== 'string') {
					throw new Error('Module name must be a string');
				}

				switch (module) {
					case 'db:nosql': {
						return this.dbService.allocateNoSQL(workspace);
					}
					case 'db:sql': {
						return this.dbService.allocateSQL(workspace);
					}
					case 'wss': {
						const wssModule = this.wssService.allocateWSS(workspace, path.replace('routes/', ''));

						return wssModule.public();
					}
					default: {
						throw new InternalServerErrorException(`Module ${module} not found`);
					}
				}
			}
		});

		new Script(this.fsService.readRoute(workspace, path)).runInContext(ctx, {
			filename: this.fsService.constructProjectPath(workspace, path)
		});

		return ctx.module.exports;
	}

	public static isValidHandlerModule<T>(module: any): module is RESTEndpointHandlers<T> | WSGatewayHandlers {
		if (EndpointService.isGateway(module)) {
			return !['get', 'post', 'put', 'del', 'patch'].some((method) => method in module);
		}

		return true;
	}

	public static isGateway<T = any>(module: RESTEndpointHandlers<T> | WSGatewayHandlers): module is WSGatewayHandlers {
		return 'onMessage' in module;
	}
}
