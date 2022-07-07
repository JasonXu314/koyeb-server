import { InternalServerErrorException } from '@nestjs/common';

type SQLRow = { [key: string]: string | number | boolean | null };
type Predicate<T extends SQLRow = SQLRow> = (row: T) => boolean;

class Query<T extends SQLRow, S extends Partial<T>> {
	public readonly where: (predicate: Predicate<T>) => this;
	public readonly from: (tableName: string) => this;
	public readonly exec: () => S[];

	constructor(tables: Map<string, T[]>, selection: (keyof S | typeof SQLDBModule.ALL)[]) {
		let wherePredicate: Predicate<T> = () => true;
		let tableName = '';

		this.where = (pred) => {
			wherePredicate = pred;
			return this;
		};

		this.from = (table: string) => {
			tableName = table;
			return this;
		};

		this.exec = () => {
			return tables
				.get(tableName)
				.filter((row) => wherePredicate(row))
				.map((row) =>
					selection.includes(SQLDBModule.ALL)
						? ({ ...row } as unknown as S)
						: selection.reduce<S>((acc, key) => {
								acc[key as keyof S] = row[key as keyof T] as unknown as S[keyof S];
								return acc;
						  }, {} as S)
				);
		};
	}

	static and<T extends SQLRow>(...predicates: Predicate<T>[]) {
		(row: T) => predicates.every((pred) => pred(row));
	}

	static or<T extends SQLRow>(...predicates: Predicate<T>[]) {
		return (row: T) => predicates.some((pred) => pred(row));
	}

	static eq =
		<T extends SQLRow, K extends keyof T>(key: K, value: T[K]) =>
		(row: T) =>
			row[key] === value;
	static ne =
		<T extends SQLRow, K extends keyof T>(key: K, value: T[K]) =>
		(row: T) =>
			row[key] !== value;
	static gt =
		<T extends SQLRow, K extends keyof T>(key: K, value: T[K]) =>
		(row: T) =>
			row[key] > value;
	static ge =
		<T extends SQLRow, K extends keyof T>(key: K, value: T[K]) =>
		(row: T) =>
			row[key] >= value;
	static lt =
		<T extends SQLRow, K extends keyof T>(key: K, value: T[K]) =>
		(row: T) =>
			row[key] < value;
	static le =
		<T extends SQLRow, K extends keyof T>(key: K, value: T[K]) =>
		(row: T) =>
			row[key] <= value;

	static like<T extends SQLRow, K extends keyof T>(key: K, value: string) {
		if (/^%.*%$/.test(value)) {
			return (row: T & Record<K, string>) => row[key].includes(value.slice(1, -1));
		} else if (/^%.*$/.test(value)) {
			return (row: T & Record<K, string>) => row[key].endsWith(value.slice(1));
		} else if (/^.*%$/.test(value)) {
			return (row: T & Record<K, string>) => row[key].startsWith(value.slice(0, -1));
		} else {
			return (row: T & Record<K, string>) => row[key] === value;
		}
	}
}

class Insertion<T extends SQLRow> {
	public readonly into: (tableName: string) => Insertion<T>;
	public readonly values: (values: T) => Insertion<T>;
	public readonly exec: () => T;

	constructor(tables: Map<string, T[]>) {
		let row: T | null = null;
		let tableName = '';

		this.into = (table: string) => {
			tableName = table;
			return this;
		};

		this.values = (values) => {
			row = values;
			return this;
		};

		this.exec = () => {
			if (!row) {
				throw new Error('No data provided');
			}
			if (!tableName) {
				throw new Error('No table specified');
			}

			if (tables.has(tableName)) {
				tables.get(tableName).push(row);
				return row;
			} else {
				throw new InternalServerErrorException(`Table ${tableName} does not exist`);
			}
		};
	}
}

export class SQLDBModule {
	public static readonly ALL = {};
	public static readonly Query = Query;
	public readonly ALL: typeof SQLDBModule.ALL = SQLDBModule.ALL;

	public readonly select: <T extends SQLRow, S extends Partial<T>>(...keys: (keyof S | typeof SQLDBModule.ALL)[]) => Query<T, S>;
	public readonly insert: <T extends SQLRow>() => Insertion<T>;
	public readonly create: (tableName: string) => this;
	public readonly drop: (tableName: string) => this;

	constructor() {
		const tables = new Map();

		this.select = (...keys) => {
			return new Query(tables, keys);
		};

		this.insert = () => {
			return new Insertion(tables);
		};

		this.create = (tableName) => {
			if (!tables.has(tableName)) {
				tables.set(tableName, []);
			}

			return this;
		};

		this.drop = (tableName) => {
			if (tables.has(tableName)) {
				tables.delete(tableName);
			}

			return this;
		};
	}
}
