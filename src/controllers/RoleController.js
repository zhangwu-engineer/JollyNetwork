/**
 * Role controller class, in charge of transactions related to user's roles.
 */
const mongodb = require('mongodb');

const EntityRole = require('../entities/EntityRole'),
	DbNames = require('../enum/DbNames');


class RoleController {

	/**
     * Controller constructor method.
	 * @returns {RoleController|*}
	 */
	constructor () {

		if ( !RoleController.instance ) {

			RoleController.instance = this;
		}

		return RoleController.instance;
	}

	/**
     * Returns default database.
	 * @returns {Db}
	 */
	getDefaultDB () {

		let Database = JOLLY.service.Db,
			databaseName = DbNames.DB;

		return Database.database(databaseName);
	}

	/**
	 * create new role.
	 * @param {Object} options
	 * @returns {Promise<Object>}
	 */
	addRole (options) {

		let self = this,
			authService = JOLLY.service.Authentication;

		return new Promise((resolve, reject) => {

			let {name, rate, unit, user_id} = options,
        newRole;

      newRole = new EntityRole({
        name,
        rate,
        unit,
        user_id,
			});

      self.saveRole(newRole)
        .then((roleData) => {
          resolve (roleData.toJson({}));
        })
        .catch(reject)
		});
	}

	listRoles(cb) {

		let Database = JOLLY.service.Db;

		Database.query(DbNames.DB, 'roles', (userRoleList) => {

			let itemList = [];

			if (userRoleList) {

				userRoleList.forEach((roleData) => {

					let roleObject = new EntityRole(roleData);

					itemList.push(roleObject.toJson({}));
				})

			}

			cb(itemList);
		});
  }

  getUserRoles(userId) {
    let db = this.getDefaultDB();
    return new Promise((resolve, reject) => {

      db
        .collection('roles')
        .find({
          user_id: new mongodb.ObjectID(userId),
        })
        .toArray((err, result) => {
          if (err) reject(err);
          let itemList = [];

          if (result) {

            result.forEach((roleData) => {

              let roleObject = new EntityRole(roleData);

              itemList.push(roleObject.toJson({}));
            })

          }

          resolve (itemList);
        });
    });
  }

  findRoleById (id) {

		let db = this.getDefaultDB(),
			role = null;
		return new Promise((resolve, reject) => {

			db.collection('roles').findOne({
				_id: new mongodb.ObjectID(id),
			}).then((data) => {

				if (data) {

					role = new EntityRole(data);
				}

				resolve (role);

			}).catch(reject);

		});
	}
	/**
	 * Save role into database.
	 * @param {EntityRole} role - User entity we are going to register into system.
	 * @returns {Promise}
	 * @resolve {EntityUser}
	 */
	saveRole (role) {

		let db = this.getDefaultDB(),
			collectionName = 'roles',
			roleData = role.toJson(),
			roleEntity;

		if (roleData.id == null) {
			delete (roleData.id);
		}

		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.insertOne(roleData)
				.then((result) => {
					//roleData.id = result.insertedId;
					roleEntity = new EntityRole(roleData);
					resolve(roleEntity);
				})
				.catch(reject);

			});
  }

  updateRole(id, data) {
    let db = this.getDefaultDB(),
      collectionName = 'roles',
      role = null;;

		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.updateOne({_id: new mongodb.ObjectID(id)}, { $set: data })
				.then((result) => {
          return db.collection('roles').findOne({
            _id: new mongodb.ObjectID(id),
          });
        })
        .then((data) => {

          if (data) {

            role = new EntityRole(data);
          }

          resolve (role);

        })
				.catch(reject);

			});
  }

  deleteRole(id) {
    let db = this.getDefaultDB(),
      collectionName = 'roles',
      role = null;

		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.deleteOne({_id: new mongodb.ObjectID(id)})
				.then(() => {
          resolve();
        })
				.catch(reject);

			});
  }
}

module.exports = RoleController;
