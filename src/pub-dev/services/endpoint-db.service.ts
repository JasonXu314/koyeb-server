import { Injectable } from '@nestjs/common';
import { NoSQLDBModule } from './dbs/nosql';
import { SQLDBModule } from './dbs/sql';

@Injectable()
export class EndpointDBService {
	private readonly noSQLDBs: Record<string, NoSQLDBModule> = {};
	private readonly SQLDBs: Record<string, SQLDBModule> = {};

	constructor() {}

	public allocateNoSQL(workspace: string): NoSQLDBModule {
		return this.noSQLDBs[workspace] || (this.noSQLDBs[workspace] = new NoSQLDBModule());
	}

	public allocateSQL(workspace: string): SQLDBModule {
		return this.SQLDBs[workspace] || (this.SQLDBs[workspace] = new SQLDBModule());
	}
}
