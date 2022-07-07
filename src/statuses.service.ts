import { Injectable, OnModuleInit } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PubDevController } from './pub-dev/pub-dev.controller';

export type Status = 'up' | 'error' | 'down';

@Injectable()
export class StatusService implements OnModuleInit {
	private _serverStatuses: Map<string, Status> = new Map();
	private _handlerStatuses: Map<string, Map<string, Status>> = new Map();

	constructor(private reflector: Reflector) {}

	public getServerStatus(server: string): Status {
		return this._serverStatuses.get(server);
	}

	public updateServerStatus(server: string, status: Status): void {
		if (this._serverStatuses.has(server) && this._serverStatuses.get(server) !== status) {
			this._serverStatuses.set(server, status);
		}
	}

	public getHandlerStatus(server: string, handler: string): Status {
		if (!this._handlerStatuses.has(server)) {
			this._handlerStatuses.set(server, new Map());
		}

		const handlerStatuses = this._handlerStatuses.get(server);

		if (!handlerStatuses.has(handler)) {
			handlerStatuses.set(handler, 'up');
		}

		return handlerStatuses.get(handler);
	}

	public updateHandlerStatus(server: string, handler: string, status: Status): void {
		if (!this._handlerStatuses.has(server)) {
			this._handlerStatuses.set(server, new Map());
		}

		const handlerStatuses = this._handlerStatuses.get(server);

		if (handlerStatuses.has(handler) && handlerStatuses.get(handler) !== status) {
			handlerStatuses.set(handler, status);
		}
	}

	public getServerStatuses(): [string, Status][] {
		return [...this._serverStatuses.entries()];
	}

	public getHandlerStatuses(server: string): [string, Status][] {
		if (!this._handlerStatuses.has(server)) {
			return [];
		}

		return [...this._handlerStatuses.get(server).entries()];
	}

	public onModuleInit() {
		this._serverStatuses.set('PubDevController', 'up');
		this._handlerStatuses.set(
			'PubDevController',
			new Map(
				Object.getOwnPropertyNames(PubDevController.prototype)
					.filter((method) => this.reflector.get('method', PubDevController.prototype[method]) !== undefined)
					.map((method) => [method, 'up'])
			)
		);
	}
}
