import { Injectable, MethodNotAllowedException } from '@nestjs/common';
import { Script } from 'node:vm';
import { EndpointResponse } from '../interceptors/endpoint.interceptor';
import { transformMethod } from '../utils';
import { EndpointDBService } from './endpoint-db.service';
import { FilesystemService } from './filesystem.service';

type Req<T> = {
	query: Record<string, string>;
	body: T;
};

type EndpointHandlers<T> = Partial<{
	get: (req: Req<T>) => EndpointResponse;
	post: (req: Req<T>) => EndpointResponse;
	put: (req: Req<T>) => EndpointResponse;
	del: (req: Req<T>) => EndpointResponse;
	patch: (req: Req<T>) => EndpointResponse;
	setup: () => void;
	cleanup: () => void;
}>;

@Injectable()
export class EndpointService {
	constructor(private fsService: FilesystemService, private dbService: EndpointDBService) {}

	public async evaluateEndpoint<T>(workspace: string, path: string, method: string, query: Record<string, string>, body: T): Promise<EndpointResponse> {
		const handlers = this._evaluateModule<T>(workspace, path);

		if (!handlers[transformMethod(method)]) {
			throw new MethodNotAllowedException(`${method} not allowed for ${path}`);
		} else {
			return handlers[transformMethod(method)]({ query, body });
		}
	}

	private _evaluateModule<T>(workspace: string, path: string): EndpointHandlers<T> {
		return new Script(this.fsService.readFile(workspace, path)).runInNewContext(
			{
				module: {},
				require: (module: string) => {
					if (typeof module !== 'string') {
						throw new Error('Module name must be a string');
					}

					if (module === 'db:nosql') {
						return this.dbService.allocateNoSQL(workspace);
					}
				}
			},
			{ filename: this.fsService.constructPath(workspace, path) }
		) as EndpointHandlers<T>;
	}
}
