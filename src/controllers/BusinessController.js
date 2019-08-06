/**
 * Business controller class, in charge of transactions related to businesses.
 */
const mongodb = require('mongodb');
const Promise = require('bluebird');
const EntityBusiness = require('../entities/EntityBusiness'),
	DbNames = require('../enum/DbNames');


class BusinessController {

	/**
     * Controller constructor method.
	 * @returns {BusinessController|*}
	 */
	constructor () {

		if ( !BusinessController.instance ) {

			BusinessController.instance = this;
		}

		return BusinessController.instance;
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

  async getBusinessBySlug(slug) {
    let self = this,
		business = null;
		const userController = JOLLY.controller.UserController;

    try {
			business = await self.findBusinessBySlug(slug);
      if (business) {
				const businessData = business.toJson({});
				const userData = await userController.getUserById(businessData.user);
				businessData.user = userData;
        return businessData;
			}
      throw new ApiError('Business not found');
    } catch (err) {
      throw err;
    }
  }

  async getBusinessById(businessId) {
		const userController = JOLLY.controller.UserController;
    let business = null;
    try {
      business = await this.findBusinessById(businessId);
      if (business) {
        const businessData = business.toJson({});
        if (businessData.user) {
          const userData = await userController.getUserById(businessData.user);
          businessData.userData = userData;
        }
        return businessData;
      }
      throw new ApiError('Business not found');
    } catch (err) {
      throw err;
    }
  }
  
  findBusinessBySlug (slug) {

		let db = this.getDefaultDB(),
			business = null;
			
		return new Promise((resolve, reject) => {

			db.collection('businesses').findOne({
			  slug,
			}).then((data) => {
				if (data) {

					business = new EntityBusiness(data);
				}

				resolve (business);

			}).catch(reject);

		});
	}

	findBusinessById (businessId) {

		let db = this.getDefaultDB(),
			business = null;
			
		return new Promise((resolve, reject) => {

			db.collection('businesses').findOne({
			  _id: new mongodb.ObjectID(businessId),
			}).then((data) => {
				if (data) {

					business = new EntityBusiness(data);
				}

				resolve (business);

			}).catch(reject);

		});
	}
	
	async searchCityBusinesses(city, query, page, perPage, role, activeStatus, userId) {
    const db = this.getDefaultDB();
    const skip = page && perPage ? (page - 1) * perPage : 0;
    let businesses = [];

    const connectionController = JOLLY.controller.ConnectionController;
    const userController = JOLLY.controller.UserController;
    const user = await userController.getUserById(userId);
    let queryConnections1 = {
      to: { $in: [userId, user.email] },
    };
    let queryConnections2 = {
      from: { $in: [ userId, user.email]},
    };

    const connections1 = await connectionController
      .findConnections(queryConnections1);
    const businessesFromConnection1 = connections1.map(connection => connection.from);
    const connections2 = await connectionController
      .findConnections(queryConnections2);
    const businessesFromConnection2 = connections2.map(connection => connection.to);
    let businessIds = businessesFromConnection1.concat(businessesFromConnection2);
    businessIds = businessIds.filter((v, i, arr) => arr.indexOf(v) === i);

    businessIds = await Promise.map(businessIds, businessId => mongodb.ObjectID.isValid(businessId) ? new mongodb.ObjectID(businessId) : null);
    businessIds = businessIds.filter(businessId => businessId !== null);

    
    const aggregates = [
      {
        $match : {
          user: { $ne: new mongodb.ObjectID(userId) },
          _id: { $nin: businessIds }
        }
      },
      { $sort  : { _id : -1 } },
    ];
    aggregates.push({
      $match : {
        'name': { $ne: null },
      }
    });
    if (city) {
      aggregates[0]['$match']['location'] = city
    }
    if (query) {
      aggregates.push({
        $match : {
          'slug': { $regex: new RegExp(`^${query.split(' ').join('-')}`, "i") },
        }
      });
    }
    if (role) {
      aggregates.push({
        $lookup: {
          from: "roles",
          localField: "user",
          foreignField: "user_id",
          as: "roles"
        }
      });
      aggregates.push({
        $unwind: "$roles"
      });
      aggregates.push({
        $match : {
          'roles.name': role,
        }
      });
    }
    if (page && perPage) {
      aggregates.push({
        $facet : {
          meta: [ { $count: "total" }, { $addFields: { page: parseInt(page, 10) } } ],
          data: [ { $skip:  skip}, { $limit:  perPage } ]
        }
      })
    } else {
      aggregates.push({
        $facet : {
          meta: [ { $count: "total" }, { $addFields: { page: parseInt(page, 10) } } ],
          data: [ { $skip:  skip} ]
        }
      })
    }
    try {
      const data = await db.collection('businesses').aggregate(aggregates).toArray();

      const businessProfiles = data[0].data;
      businesses = await Promise.map(businessProfiles, profile => this.getBusinessById(profile._id.toString()));
      return {
        total: data[0].meta[0] ? data[0].meta[0].total : 0,
        page: data[0].meta[0] && data[0].meta[0].page ? data[0].meta[0].page : 1,
        businesses,
      };
    } catch (err) {
      throw new ApiError(err.message);
    }
  }

  async getBusinessConnections(userId, city, query, role, connection) {
    const db = this.getDefaultDB();
    let connections = [];
    try {
      const connectionController = JOLLY.controller.ConnectionController;
      const userController = JOLLY.controller.UserController;
      const user = await userController.getUserById(userId);
      let queryConnections1 = {
        to: { $in: [userId, user.email] },
        status: ConnectionStatus.CONNECTED
      };
      let queryConnections2 = {
        from: { $in: [ userId, user.email]},
        status: ConnectionStatus.CONNECTED,
      };

      const connections1 = await connectionController
        .findConnections(queryConnections1);
      const businessesFromConnection1 = connections1.map(connection => connection.from);
      const connections2 = await connectionController
        .findConnections(queryConnections2);
      const businessesFromConnection2 = connections2.map(connection => connection.to);
      let businessIds = businessesFromConnection1.concat(businessesFromConnection2);
      businessIds = businessIds.filter((v, i, arr) => arr.indexOf(v) === i);

      businessIds = await Promise.map(businessIds, businessId => new mongodb.ObjectID(businessId.toString()));

      const aggregates = [
        {
          $match : {
            user: { $ne: new mongodb.ObjectID(userId) },
            _id: { $in: businessIds },
          }
        },
        { $sort  : { _id : -1 } },
      ];
      if (city) {
        aggregates[0]['$match']['location'] = city
      }
      if (query) {
        aggregates.push({
          $match : {
            'slug': { $regex: new RegExp(`^${query.split(' ').join('-')}`, "i") },
          }
        });
      }
      if (role) {
        aggregates.push({
          $lookup: {
            from: "roles",
            localField: "user",
            foreignField: "user_id",
            as: "roles"
          }
        });
        aggregates.push({
          $unwind: "$roles"
        });
        aggregates.push({
          $match : {
            'roles.name': role,
          }
        });
      }
      const businessProfiles = await db.collection('businesses').aggregate(aggregates).toArray();
      connections = await Promise.map(businessProfiles, profile => this.getBusinessById(profile._id.toString()));
      return connections;
    } catch (err) {
      throw new ApiError(err.message);
    }
  }

  updateBusiness(businessId, data) {
    let db = this.getDefaultDB(),
      collectionName = 'businesses',
      business = null;

		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.updateOne({ _id: new mongodb.ObjectID(businessId) }, { $set: data })
				.then(() => {
					return db.collection(collectionName).findOne({
            _id: new mongodb.ObjectID(businessId),
          });
        })
        .then((data) => {

          if (data) {

            business = new EntityBusiness(data);
          }

          resolve (business);

        })
				.catch(reject);

			});
  }
	
}

module.exports = BusinessController;
