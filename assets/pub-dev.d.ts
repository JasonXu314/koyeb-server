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
	type Predicate<T extends SQLRow = SQLRow> = (row: T) => boolean;

	export declare class Query<T extends SQLRow, S extends Partial<T>> {
		constructor(tables: Map<string, T[]>, selection: (keyof S)[]);

		public where(predicate: Predicate<T>): Query<T, S>;
		public from(tableName: string): Query<T, S>;

		public exec(): S[];

		static and<T extends SQLRow>(...predicates: Predicate<T>[]): Predicate<T>;
		static or<T extends SQLRow>(...predicates: Predicate<T>[]): Predicate<T>;

		static eq<T extends SQLRow, K extends keyof T>(key: K, value: T[K]): Predicate<T>;
		static ne<T extends SQLRow, K extends keyof T>(key: K, value: T[K]): Predicate<T>;
		static gt<T extends SQLRow, K extends keyof T>(key: K, value: T[K]): Predicate<T>;
		static ge<T extends SQLRow, K extends keyof T>(key: K, value: T[K]): Predicate<T>;
		static lt<T extends SQLRow, K extends keyof T>(key: K, value: T[K]): Predicate<T>;
		static le<T extends SQLRow, K extends keyof T>(key: K, value: T[K]): Predicate<T>;

		static between<T extends SQLRow, K extends keyof T>(key: K, low: number, high: number): Predicate<T>;
		static like<T extends SQLRow, K extends keyof T>(key: K, value: string): Predicate<T>;
	}

	export declare class Insertion<T extends SQLRow> {
		constructor(tables: Map<string, T[]>);

		public into(tableName: string): Insertion<T>;
		public values(values: T): Insertion<T>;

		public exec(): T;
	}

	export declare function select<T extends SQLRow, S extends Partial<T>>(...keys: (keyof S)[]): Query<T, S>;
	export declare function insert<T extends SQLRow>(): Insertion<T>;
	export declare function create(tableName: string): db;
	export declare function drop(tableName: string): db;
	export declare const ALL: object;
}

declare module 'wss' {
	type WebSocket = import('ws').WebSocket;

	export declare function hasServer(): boolean;
	export declare function broadcast(message: string): void;
	export declare function clients(): WebSocket[];
}
