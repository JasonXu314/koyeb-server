import { randomUUID } from 'crypto';

type WithId<T> = T & { id: string };

class Collection<T> {
	public readonly find: (query: Partial<WithId<T>>) => WithId<T>[];
	public readonly findOne: (query: Partial<WithId<T>>) => WithId<T> | null;
	public readonly insert: (doc: WithId<T>) => WithId<T>;
	public readonly remove: (query: Partial<WithId<T>>) => WithId<T>;
	public readonly removeAll: (query: Partial<WithId<T>>) => WithId<T>[];
	public readonly update: (query: Partial<WithId<T>>, update: Partial<WithId<T>>) => WithId<T>;

	constructor() {
		const docs: WithId<T>[] = [];

		this.find = (query: Partial<WithId<T>>) => {
			return docs.filter((doc) => Object.entries(query).every(([key, value]) => doc[key] === value)).map((doc) => ({ ...doc }));
		};

		this.findOne = (query: Partial<WithId<T>>) => {
			const doc = docs.find((doc) => Object.entries(query).every(([key, value]) => doc[key] === value));

			return doc ? { ...doc } : null;
		};

		this.insert = (doc: WithId<T>) => {
			const copy: WithId<T> = { id: randomUUID(), ...doc };

			docs.push(copy);
			return { ...copy };
		};

		this.remove = (query: Partial<WithId<T>>) => {
			const idx = docs.findIndex((doc) => Object.entries(query).every(([key, value]) => doc[key] === value));

			return idx === -1 ? null : docs.splice(idx, 1)[0];
		};

		this.removeAll = (query: Partial<WithId<T>>) => {
			const toBeDeleted = docs.filter((doc) => Object.entries(query).every(([key, value]) => doc[key] === value));

			toBeDeleted.forEach((doc) => docs.splice(docs.indexOf(doc), 1));
			return toBeDeleted;
		};

		this.update = (query: Partial<WithId<T>>, update: Partial<WithId<T>>) => {
			const idx = docs.findIndex((doc) => Object.entries(query).every(([key, value]) => doc[key] === value));

			if (idx !== -1) {
				docs[idx] = { ...docs[idx], ...update };
				return docs[idx];
			}

			return null;
		};
	}
}

export class NoSQLDBModule {
	public readonly collection: <T>(name: string) => Collection<T>;

	constructor() {
		const collections: Record<string, Collection<any>> = {};

		this.collection = <T>(name: string) => collections[name] || (collections[name] = new Collection<T>());
	}
}
