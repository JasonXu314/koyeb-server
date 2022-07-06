import { Injectable } from '@nestjs/common';
import { Server } from 'http';
import { WSModule } from './artificial-modules/wss';

@Injectable()
export class WSSService {
	private readonly wsss: Record<string, WSModule> = {};
	private _httpServer: Promise<Server>;
	private _serverResolver: (server: Server) => void;

	constructor() {
		this._httpServer = new Promise((resolve) => {
			this._serverResolver = resolve;
		});
	}

	public allocateWSS(workspace: string, gatewayPath: string): WSModule {
		const wsModule = this.wsss[workspace] || (this.wsss[workspace] = new WSModule(this._httpServer, `${workspace}/${gatewayPath}`));

		if (WSModule.getPath(wsModule) !== `${workspace}/${gatewayPath}`) {
			throw new Error('WSSService: workspace already allocated (you may only have 1 gateway per project)');
		}

		return wsModule;
	}

	public getWSModule(workspace: string): WSModule | undefined {
		return this.wsss[workspace];
	}

	public useServer(server: Server): void {
		this._serverResolver(server);
	}
}
