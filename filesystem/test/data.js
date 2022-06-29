const db = require('db:nosql');

module.exports = {
	get: (req) => {
		const collection = db.collection('todos');
		
		if (req.query.id) {
			const todo = collection.findOne({ id: req.query.id });

			if (todo) {
				return {
					status: 200,
					data: todo
				};
			} else {
				return {
					status: 404,
					data: {
						message: `No todo with id "${req.query.id}" found`
					}
				};
			}
		} else {
			return {
				status: 200,
				data: collection.find({})
			};
		}
	},
	post: (req) => {
		const collection = db.collection('todos');

		if (req.body) {
			return {
				status: 201,
				data: collection.insert(req.body)
			};
		} else {
			return {
				status: 404,
				data: {
					message: 'Request body must be todo'
				}
			};
		}
	}
};
