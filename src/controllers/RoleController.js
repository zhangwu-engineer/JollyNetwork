/**
 * Role controller class, in charge of transactions related to user's roles.
 */
const mongodb = require('mongodb');
const Promise = require('bluebird');
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
	async addRole (options) {
    try {
      const userController = JOLLY.controller.UserController;
			let {name, years, minRate, maxRate, unit, user_id, business_id} = options,
        newRole;

      newRole = new EntityRole({
				name,
				years,
				minRate,
        maxRate,
        unit,
        user_id,
        business_id,
      });
      
      const roleData = await this.saveRole(newRole);
      if (!business_id) {
        await userController.checkCityFreelancerBadge(user_id);
      }
      return roleData.toJson({});
    } catch(err) {
      throw new ApiError(err.message);
    }
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

  getBusinessRoles(businessId) {
    let db = this.getDefaultDB();
    return new Promise((resolve, reject) => {

      db
        .collection('roles')
        .find({
          business_id: new mongodb.ObjectID(businessId),
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
    
    let query = { name: roleData.name, user_id: new mongodb.ObjectID(roleData.user_id) };
    if (roleData.business_id) {
      query = { name: roleData.name, business_id: new mongodb.ObjectID(roleData.business_id) };
      roleData.user_id = null;
    }

		return new Promise((resolve, reject) => {
      db.collection(collectionName)
        .findOne(query)
        .then((data) => {
          if (data) {
            resolve(new EntityRole(data));
          } else {
            return db.collection(collectionName).insertOne(roleData)
          }
        })
				.then(() => {
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

  async cleanDateStarted() {
    const db = this.getDefaultDB();
    try {
      const roles = await db.collection('roles').find({}).toArray();
      const res = await Promise.map(roles, role =>
        db
          .collection('roles')
          .updateOne(
            { _id: new mongodb.ObjectID(role._id) },
            {
              $set: {
                years: new Date().getFullYear() - new Date(role.dateStarted).getFullYear()
              },
              $unset: {
                dateStarted: '',
              },
            }
          )
      );
      return res;
    } catch(err) {
      throw new ApiError(err.message);
    }
  }
}

module.exports = RoleController;
