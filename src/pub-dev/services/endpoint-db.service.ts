import { Injectable } from '@nestjs/common';
import { NoSQLDBModule } from './dbs/nosql';

@Injectable()
export class EndpointDBService {
	private readonly noSQLDbs: Record<string, NoSQLDBModule> = {};

	constructor() {}

	public allocateNoSQL(workspace: string): NoSQLDBModule {
		return this.noSQLDbs[workspace] || (this.noSQLDbs[workspace] = new NoSQLDBModule());
	}
}
