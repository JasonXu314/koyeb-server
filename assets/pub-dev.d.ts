declare type Req<T> = {
	query: Record<string, string>;
	body: T;
};

declare type EndpointHandlers<T> = Partial<{
	get: (req: Req<T>) => EndpointResponse;
	post: (req: Req<T>) => EndpointResponse;
	put: (req: Req<T>) => EndpointResponse;
	del: (req: Req<T>) => EndpointResponse;
	patch: (req: Req<T>) => EndpointResponse;
	setup: () => void;
	cleanup: () => void;
}>;

declare module 'db:nosql' {
	type WithId<T> = T & { id: string };

	declare class Collection<T> {
		public find(query: Partial<WithId<T>>): WithId<T>[];
		public findOne(query: Partial<WithId<T>>): WithId<T> | null;
		public insert(doc: WithId<T>): WithId<T>;
		public remove(query: Partial<WithId<T>>): WithId<T> | null;
		public removeAll(query: Partial<WithId<T>>): WithId<T>[];
		public update(query: Partial<WithId<T>>, doc: Partial<WithId<T>>): WithId<T> | null;
	}

	export declare function collection<T>(name: string): Collection<T>;
}

declare module 'db:sql' {
	type db = typeof import('db:sql');
	type SQLRow = { [key: string]: string | number | boolean | null };
	type Schema<T extends SQLRow = SQLRow> = {
		[K in keyof T]: T[K] extends boolean
			? typeof Boolean
			: T[K] extends string
			? typeof String
			: T[K] extends number
			? typeof Number | typeof PrimaryKey
			: never;
	};
	type Predicate<T extends SQLRow = SQLRow> = (row: T) => boolean;

	export declare class Query<T extends SQLRow, S extends Partial<T>> {
		constructor(tables: Map<string, T[]>, schemas: Map<string, Schema<T>>, selection: (keyof S)[]);

		public where(predicate: Predicate<T>): Query<T, S>;
		public from(tableName: string): Query<T, S>;

		public exec(): S[];

		public static and<T extends SQLRow>(...predicates: Predicate<T>[]): Predicate<T>;
		public static or<T extends SQLRow>(...predicates: Predicate<T>[]): Predicate<T>;

		public static eq<T extends SQLRow, K extends keyof T>(key: K, value: T[K]): Predicate<T>;
		public static ne<T extends SQLRow, K extends keyof T>(key: K, value: T[K]): Predicate<T>;
		public static gt<T extends SQLRow, K extends keyof T>(key: K, value: T[K]): Predicate<T>;
		public static ge<T extends SQLRow, K extends keyof T>(key: K, value: T[K]): Predicate<T>;
		public static lt<T extends SQLRow, K extends keyof T>(key: K, value: T[K]): Predicate<T>;
		public static le<T extends SQLRow, K extends keyof T>(key: K, value: T[K]): Predicate<T>;

		public static between<T extends SQLRow, K extends keyof T>(key: K, low: number, high: number): Predicate<T>;
		public static like<T extends SQLRow, K extends keyof T>(key: K, value: string): Predicate<T>;
	}

	export declare class Insertion<T extends SQLRow> {
		constructor(tables: Map<string, T[]>, schemas: Map<string, Schema<T>>);

		public into(tableName: string): Insertion<T>;
		public values(values: T): Insertion<T>;

		public exec(): T;
	}

	export declare const ALL: object;
	export declare const PrimaryKey: object;

	export declare function select<T extends SQLRow, S extends Partial<T>>(...keys: (keyof S)[]): Query<T, S>;
	export declare function insert<T extends SQLRow>(): Insertion<T>;
	export declare function create<T extends SQLRow>(tableName: string, schema: T): db;
	export declare function drop(tableName: string): db;

	export declare function schema<T extends SQLRow>(obj: Schema<T>): Schema<T>;
}

declare module 'wss' {
	type WebSocket = import('ws').WebSocket;

	export declare function hasServer(): boolean;
	export declare function broadcast(message: string): void;
	export declare function clients(): WebSocket[];
}
