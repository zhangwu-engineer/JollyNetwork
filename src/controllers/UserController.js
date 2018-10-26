/**
 * User controller class, in charge of transactions related to users and their profiles.
 */
const mongodb = require('mongodb');

const EntityUser = require('../entities/EntityUser'),
	DbNames = require('../enum/DbNames');


class UserController {

	/**
     * Controller constructor method.
	 * @returns {UserController|*}
	 */
	constructor () {

		if ( !UserController.instance ) {

			UserController.instance = this;
		}

		return UserController.instance;
	}

	/**
     * Returns default database related to user's account.
	 * @returns {Db}
	 */
	getDefaultDB () {

		let Database = JOLLY.service.Db,
			databaseName = DbNames.DB;

		return Database.database(databaseName);
	}

	/**
	 * Register user into system.
	 * @param {Object} options
	 * @returns {Promise<Object>}
	 */
	registerUser (options) {

		let self = this,
			authService = JOLLY.service.Authentication;

		return new Promise((resolve, reject) => {

			let {email, firstName, lastName, password} = options,
				encryptedPassword = password ? authService.generateHashedPassword(password) : '',
				newUser;

			firstName = firstName.toLowerCase();
			lastName = lastName.toLowerCase();

			self.generateSlug({ firstName, lastName}).then(slug => {
				newUser = new EntityUser(encryptedPassword ? {
					email,
					firstName,
					lastName,
					password: encryptedPassword,
					slug,
				} : {
					email,
					firstName,
					lastName,
					slug,
				});
				return self.saveUser(newUser);
			})
			.then((userData) => {
				resolve (userData.toJson({
					isSafeOutput: true,
				}));
			})
			.catch(reject)
		});
	}

	findUserByUsername (options) {

		let db = this.getDefaultDB(),
			username = options.username,
			user = null;

		return new Promise((resolve, reject) => {

			db.collection('users').findOne({
				username
			}).then((data) => {

				if (data) {

					user = new EntityUser(data);
				}

				resolve (user);

			}).catch(reject);

		});
	}

	findUserByEmail (options) {

		let db = this.getDefaultDB(),
			email = options.email,
			user = null;

		return new Promise((resolve, reject) => {

			db.collection('users').findOne({
				email
			}).then((data) => {

				if (data) {

					user = new EntityUser(data);
				}

				resolve (user);

			}).catch(reject);

		});
	}

	findUserById (id) {

		let db = this.getDefaultDB(),
			user = null;
		return new Promise((resolve, reject) => {

			db.collection('users').findOne({
				_id: new mongodb.ObjectID(id),
			}).then((data) => {

				if (data) {

					user = new EntityUser(data);
				}

				resolve (user);

			}).catch(reject);

		});
	}

	listUsers(cb) {

		let Database = JOLLY.service.Db;

		Database.query(DbNames.DB, 'users', (userList) => {

			let itemList = [];

			if (userList) {

				userList.forEach((userData) => {

					let userObject = new EntityUser(userData);

					itemList.push(userObject.toJson({isSafeOutput: true}));
				})

			}

			cb(itemList);
		});
	}

	findUser(cb) {

		let db = this.getDefaultDB();

		db.collection('users').findOne((err, result) => {

			if (err) throw err;

			let user = new EntityUser(result);
			cb(user);
		});
	}

	generateSlug(options) {
		return new Promise((resolve, reject) => {
			let db = this.getDefaultDB();
			db.collection('users').countDocuments(options).then(count => {
				const slug = count === 0
					? `${options.firstName}-${options.lastName}`
					: `${options.firstName}-${options.lastName}-${count}`;
				resolve(slug);
			})
			.catch(reject);
		});
	}

	/**
	 * Save user into database.
	 * @param {EntityUser} user - User entity we are going to register into system.
	 * @returns {Promise}
	 * @resolve {EntityUser}
	 */
	saveUser (user) {

		let db = this.getDefaultDB(),
			collectionName = 'users',
			userData = user.toJson(),
			userEntity;

		if (userData.id == null) {
			delete (userData.id);
		}

		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.insertOne(userData)
				.then((result) => {
					//userData.id = result.insertedId;
					userEntity = new EntityUser(userData);
					resolve(userEntity);
				})
				.catch(reject);

			});
	}

}

module.exports = UserController;
