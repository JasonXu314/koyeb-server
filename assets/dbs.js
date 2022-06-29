class Collection {
	constructor() {
		const docs = [];

		this.find = (query) => {
			return docs.filter((doc) => Object.entries(query).every(([key, value]) => doc[key] === value));
		};
		this.findOne = (query) => {
			return docs.find((doc) => Object.entries(query).every(([key, value]) => doc[key] === value)) || null;
		};
		this.insert = (doc) => {
			docs.push(doc);
		};
		this.remove = (query) => {
			return (
				docs.splice(
					docs.findIndex((doc) => Object.entries(query).every(([key, value]) => doc[key] === value)),
					1
				).length !== 0
			);
		};
		this.update = (query, update) => {
			const doc = this.findOne(query);
			if (doc) {
				Object.assign(doc, update);
				return true;
			}
			return false;
		};
	}
}

class NoSQLDBModule {
	constructor() {
		const collections = {};

		this.collection = (name) => collections[name] || (collections[name] = new Collection());
	}
}

class Query {
	constructor(tables, selection) {
		let wherePredicate = () => true;
		let tableName = '';

		this.where = (pred) => {
			wherePredicate = pred;
			return this;
		};
		this.from = (table) => {
			tableName = table;
			return this;
		};

		this.exec = () => {
			return tables
				.get(tableName)
				.filter((row) => wherePredicate(row))
				.map((row) =>
					selection.includes(SQLDBModule.ALL)
						? { ...row }
						: selection.reduce((acc, key) => {
								acc[key] = row[key];
								return acc;
						  }, {})
				);
		};
	}

	static and(...predicates) {
		(row) => predicates.every((pred) => pred(row));
	}

	static or(...predicates) {
		return (row) => predicates.some((pred) => pred(row));
	}

	static eq = (key, value) => (row) => row[key] === value;
	static ne = (key, value) => (row) => row[key] !== value;
	static gt = (key, value) => (row) => row[key] > value;
	static ge = (key, value) => (row) => row[key] >= value;
	static lt = (key, value) => (row) => row[key] < value;
	static le = (key, value) => (row) => row[key] <= value;

	static like(key, value) {
		if (/^%.*%$/.test(value)) {
			return (row) => row[key].includes(value.slice(1, -1));
		} else if (/^%.*$/.test(value)) {
			return (row) => row[key].endsWith(value.slice(1));
		} else if (/^.*%$/.test(value)) {
			return (row) => row[key].startsWith(value.slice(0, -1));
		} else {
			return (row) => row[key] === value;
		}
	}
}

class Insertion {
	constructor(tables) {
		let row;
		let tableName = '';

		this.into = (table) => {
			tableName = table;
			return this;
		};
		this.values = (values) => {
			row = values;
			return this;
		};
		this.exec = () => {
			tables.get(tableName).push(row);
			return row;
		};
	}
}

class SQLDBModule {
	static ALL = {};

	constructor() {
		this.Query = Query;
		this.ALL = SQLDBModule.ALL;
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

module.exports = {
	SQLDBModule,
	NoSQLDBModule
};
