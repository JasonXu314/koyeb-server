import { InternalServerErrorException } from '@nestjs/common';

type SQLRow = { [key: string]: string | number | boolean | null };
type Predicate<T extends SQLRow = SQLRow> = (row: T) => boolean;
type Schema<T extends SQLRow = SQLRow> = {
	[K in keyof T]: T[K] extends boolean ? typeof Boolean : T[K] extends string ? typeof String : T[K] extends number ? typeof Number : never;
};

function validate<T extends SQLRow>(obj: T, schema: Schema<T>, tableName: string): void {
	const schemaKeys = Object.keys(schema),
		objKeys = Object.keys(obj);

	if (schemaKeys.length !== objKeys.length && objKeys.find((key) => schema[key] === SQLDBModule.PrimaryKey)) {
		throw new InternalServerErrorException(`${tableName} has ${schemaKeys.length} columns, but ${objKeys.length} were provided`);
	}

	schemaKeys.forEach((key) => {
		if (!objKeys.includes(key) && schema[key] !== SQLDBModule.PrimaryKey) {
			throw new InternalServerErrorException(`${tableName} has column ${key}, but no value was provided`);
		}
	});
	objKeys.forEach((key) => {
		if (!schemaKeys.includes(key)) {
			throw new InternalServerErrorException(`${tableName} has no column ${key}`);
		}
	});

	schemaKeys.forEach((key) => {
		switch (typeof obj[key]) {
			case 'string':
				if (schema[key] !== String) {
					throw new InternalServerErrorException(`${tableName} has column ${key} of type ${schema[key].name}, but was given a string`);
				}
				break;
			case 'number':
				if (schema[key] !== Number && schema[key] !== SQLDBModule.PrimaryKey) {
					throw new InternalServerErrorException(`${tableName} has column ${key} of type ${schema[key].name}, but was given a number`);
				}
				break;
			case 'boolean':
				if (schema[key] !== Boolean) {
					throw new InternalServerErrorException(`${tableName} has column ${key} of type ${schema[key].name}, but was given a boolean`);
				}
				break;
			case 'undefined':
				if (schema[key] !== SQLDBModule.PrimaryKey) {
					throw new InternalServerErrorException(`${tableName} has column ${key} of type ${schema[key].name}, but was given undefined`);
				}
				break;
			default:
				throw new InternalServerErrorException(`${tableName} has column ${key} of type ${schema[key].name}, but was given a ${typeof obj[key]}`);
		}
	});
}

function validateSchema<T extends SQLRow>(schema: Schema<T>): void {
	let hasPrimaryKey = false;

	Object.entries(schema).forEach(([key, value]) => {
		if (![String, Number, Boolean, SQLDBModule.PrimaryKey].includes(value)) {
			throw new InternalServerErrorException(`Invalid type for ${key} in schema: ${value}`);
		}

		if (value === SQLDBModule.PrimaryKey) {
			if (!hasPrimaryKey) {
				hasPrimaryKey = true;
			} else {
				throw new InternalServerErrorException('Multiple primary keys found in schema');
			}
		}
	});

	if (!hasPrimaryKey) {
		throw new InternalServerErrorException('No primary key found in schema');
	}
}

function diffSchemas<T extends SQLRow>(schema1: Schema<T>, schema2: Schema<T>): boolean {
	const schema1Keys = Object.keys(schema1),
		schema2Keys = Object.keys(schema2);

	if (schema1Keys.length !== schema2Keys.length) {
		return true;
	}

	for (const key of schema1Keys) {
		if (schema1[key] !== schema2[key]) {
			return true;
		}
	}

	return false;
}

function findPrimaryKey<T extends SQLRow>(schema: Schema<T>): keyof T {
	for (const key of Object.keys(schema)) {
		if (schema[key] === SQLDBModule.PrimaryKey) {
			return key;
		}
	}

	throw new InternalServerErrorException('No primary key found in schema');
}

function findNextPrimaryKey<T extends SQLRow>(table: T[], schema: Schema<T>): number {
	const primaryKey = findPrimaryKey(schema);

	let nextPrimaryKey: number = table.length === 0 ? 0 : (table[0][primaryKey] as number);

	table.forEach((row) => {
		if (row[primaryKey] > nextPrimaryKey) {
			nextPrimaryKey = row[primaryKey] as number;
		}
	});

	return nextPrimaryKey + 1;
}

class Query<T extends SQLRow, S extends Partial<T>> {
	public readonly where: (predicate: Predicate<T>) => this;
	public readonly from: (tableName: string) => this;
	public readonly exec: () => S[];

	constructor(tables: Map<string, T[]>, schemas: Map<string, Schema<T>>, selection: (keyof S | typeof SQLDBModule.ALL)[]) {
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
			const table = tables.get(tableName);

			if (!table) {
				throw new InternalServerErrorException(`Table ${tableName} does not exist`);
			}

			const schema = schemas.get(tableName)!;
			selection
				.filter<string>((key): key is string => key !== SQLDBModule.ALL)
				.forEach((key) => {
					if (!(key in schema)) {
						throw new InternalServerErrorException(`Table ${tableName} has no column ${key}`);
					}
				});

			return table
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

	constructor(tables: Map<string, T[]>, schemas: Map<string, Schema<T>>) {
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
				throw new InternalServerErrorException('No data provided');
			}
			if (!tableName) {
				throw new InternalServerErrorException('No table specified');
			}

			if (tables.has(tableName)) {
				const schema = schemas.get(tableName)!;
				validate(row, schema, tableName);

				const primaryKey = Object.keys(schema).find((key) => schema[key] === SQLDBModule.PrimaryKey)! as keyof T;

				if (!(primaryKey in row)) {
					row[primaryKey] = findNextPrimaryKey(tables.get(tableName)!, schemas.get(tableName)!) as T[keyof T];
				}

				tables.get(tableName)!.push(row);
				return row;
			} else {
				throw new InternalServerErrorException(`Table ${tableName} does not exist`);
			}
		};
	}
}

class Update<T extends SQLRow> {
	public readonly set: <K extends string>(column: K, value: T[K]) => Update<T>;
	public readonly where: (predicate: Predicate<T>) => Update<T>;
	public readonly exec: () => T[];

	constructor(tables: Map<string, T[]>, schemas: Map<string, Schema<T>>, tableName: string) {
		const table = tables.get(tableName),
			schema = schemas.get(tableName);
		let wherePredicate: Predicate<T> = () => true;
		let updateColumn: string | null = null,
			updateValue: T[keyof T] | null = null;

		if (!table) {
			throw new InternalServerErrorException(`Table ${tableName} does not exist`);
		}

		this.where = (pred) => {
			wherePredicate = pred;
			return this;
		};

		this.set = <K extends string>(column: K, value: T[K]) => {
			updateColumn = column;
			updateValue = value;
			return this;
		};

		this.exec = () => {
			if (updateColumn === null) {
				throw new InternalServerErrorException('No column specified');
			}
			if (updateValue === null) {
				throw new InternalServerErrorException('No value specified');
			}
			if (!schema) {
				throw new InternalServerErrorException(`Table ${tableName} does not exist`);
			}

			const updates = [],
				updatedTable = table!.map((row) => {
					const newRow = { ...row };

					if (wherePredicate(row)) {
						newRow[updateColumn as keyof T] = updateValue;
						validate(newRow, schema, tableName);
					}

					return newRow;
				});

			tables.set(tableName, updatedTable);
			return updates;
		};
	}
}

export class SQLDBModule {
	public static readonly ALL = {};
	public static readonly PrimaryKey = { name: 'Primary Key' };
	public readonly Query = Query;
	public readonly PrimaryKey = SQLDBModule.PrimaryKey;
	public readonly ALL: typeof SQLDBModule.ALL = SQLDBModule.ALL;

	public readonly select: <T extends SQLRow, S extends Partial<T>>(...keys: (keyof S | typeof SQLDBModule.ALL)[]) => Query<T, S>;
	public readonly insert: <T extends SQLRow>() => Insertion<T>;
	public readonly create: <T extends SQLRow>(tableName: string, schema: Schema<T>) => this;
	public readonly update: <T extends SQLRow>(tableName: string) => Update<T>;
	public readonly drop: (tableName: string) => this;
	public readonly schema: <T extends SQLRow>(obj: Schema<T>) => Schema<T>;

	constructor() {
		const tables = new Map(),
			schemas = new Map();

		this.select = (...keys) => {
			return new Query(tables, schemas, keys);
		};

		this.insert = () => {
			return new Insertion(tables, schemas);
		};

		this.update = (tableName) => {
			return new Update(tables, schemas, tableName);
		};

		this.create = <T extends SQLRow>(tableName: string, schema: Schema<T>) => {
			if (!tableName) {
				throw new InternalServerErrorException('No table name provided');
			}
			if (!schema) {
				throw new InternalServerErrorException('No schema provided');
			}

			if (!tables.has(tableName) || diffSchemas(schemas.get(tableName)!, schema)) {
				validateSchema(schema);

				if (!tables.has(tableName)) {
					tables.set(tableName, []);
				} else {
					// schema has changed, so throw out all the rows that can't be coerced into the new schema
					const newTable = [];

					tables.get(tableName)!.forEach((row: T) => {
						const newRow: T = { ...row };

						for (const key in schema) {
							if (!(key in newRow)) {
								if (schema[key] === Number) {
									newRow[key] = 0 as T[Extract<keyof T, string>];
								} else if (schema[key] === String) {
									newRow[key] = '' as T[Extract<keyof T, string>];
								} else if (schema[key] === Boolean) {
									newRow[key] = false as T[Extract<keyof T, string>];
								} else {
									newRow[key] = findNextPrimaryKey(newTable, schema) as T[Extract<keyof T, string>];
								}
							}
						}
						for (const key in newRow) {
							if (!(key in schema)) {
								delete newRow[key];
							} else {
								switch (typeof newRow[key]) {
									case 'string':
										if (schema[key] === Number) {
											try {
												newRow[key] = Number(newRow[key]) as T[Extract<keyof T, string>];
											} catch (_) {
												return;
											}
										} else if (schema[key] === Boolean) {
											try {
												newRow[key] = Boolean(newRow[key]) as T[Extract<keyof T, string>];
											} catch (_) {
												return;
											}
										} else if (schema[key] === SQLDBModule.PrimaryKey) {
											try {
												newRow[key] = Number(newRow[key]) as T[Extract<keyof T, string>];

												if (newTable.find((row) => row[key] === newRow[key])) {
													return;
												}
											} catch (_) {
												return;
											}
										}
										break;
									case 'number':
										if (schema[key] === String) {
											newRow[key] = newRow[key].toString() as T[Extract<keyof T, string>];
										} else if (schema[key] === Boolean) {
											newRow[key] = (newRow[key] !== 0) as T[Extract<keyof T, string>];
										} else if (schema[key] === SQLDBModule.PrimaryKey) {
											if (newTable.find((row) => row[key] === newRow[key])) {
												return;
											}
										}
										break;
									case 'boolean':
										if (schema[key] === String) {
											newRow[key] = newRow[key].toString() as T[Extract<keyof T, string>];
										} else if (schema[key] === Number) {
											newRow[key] = (newRow[key] ? 1 : 0) as T[Extract<keyof T, string>];
										} else if (schema[key] === SQLDBModule.PrimaryKey) {
											return;
										}
										break;
								}
							}
						}
					});

					tables.set(tableName, newTable);
				}

				schemas.set(tableName, schema);
			}

			return this;
		};

		this.drop = (tableName) => {
			if (!tableName) {
				throw new InternalServerErrorException('No table name provided');
			}

			if (tables.has(tableName)) {
				tables.delete(tableName);
				schemas.delete(tableName);
			}

			return this;
		};

		this.schema = <T extends SQLRow>(schema: Schema<T>) => {
			if (!schema) {
				throw new InternalServerErrorException('No schema provided');
			}

			validateSchema(schema);

			return { ...schema };
		};
	}
}
