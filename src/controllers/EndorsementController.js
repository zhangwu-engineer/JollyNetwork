/**
 * Unit controller class, in charge of transactions related to user's units.
 */
const mongodb = require('mongodb');

const EntityEndorsement = require('../entities/EntityEndorsement'),
	DbNames = require('../enum/DbNames');


class EndorsementController {

	/**
     * Controller constructor method.
	 * @returns {EndorsementController|*}
	 */
	constructor () {

		if ( !EndorsementController.instance ) {

			EndorsementController.instance = this;
		}

		return EndorsementController.instance;
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
	 * create new endorsement.
	 * @param {Object} options
	 * @returns {Promise<Object>}
	 */
	addEndorsement (options) {

		let self = this,
			authService = JOLLY.service.Authentication;

		return new Promise((resolve, reject) => {

			let {to, from, work, work_slug, role, quality} = options,
        newEndorsement;

      newEndorsement = new EntityEndorsement({
        to,
        from,
        work,
        work_slug,
        role,
        quality,
			});

      self.saveEndorsement(newEndorsement)
        .then((endorsementData) => {
          resolve (endorsementData.toJson({}));
        })
        .catch(reject)
		});
	}

	listEndorsements(cb) {

		let Database = JOLLY.service.Db;

		Database.query(DbNames.DB, 'endorsements', (endorsements) => {

			let itemList = [];

			if (endorsements) {

				endorsements.forEach((endorsementData) => {

					let endorsementObject = new EntityEndorsement(endorsementData);

					itemList.push(endorsementObject.toJson({}));
				})

			}

			cb(itemList);
		});
  }

  getUserEndorsements(userId) {
    let db = this.getDefaultDB();
    return new Promise((resolve, reject) => {

      db
        .collection('endorsements')
        .find({
          to: new mongodb.ObjectID(userId),
        })
        .toArray((err, result) => {
          if (err) reject(err);
          let itemList = [];

          if (result) {

            result.forEach((endorsementData) => {

              let endorsementObject = new EntityEndorsement(endorsementData);

              itemList.push(endorsementObject.toJson({}));
            })

          }

          resolve (itemList);
        });
    });
  }

  getEndorsementsForWork(workId, userId) {
    let db = this.getDefaultDB();
    return new Promise((resolve, reject) => {

      db
        .collection('endorsements')
        .find({
          work: new mongodb.ObjectID(workId),
          from: new mongodb.ObjectID(userId),
        })
        .toArray((err, result) => {
          if (err) reject(err);
          let itemList = [];

          if (result) {

            result.forEach((endorsementData) => {

              let endorsementObject = new EntityEndorsement(endorsementData);

              itemList.push(endorsementObject.toJson({}));
            })

          }

          resolve (itemList);
        });
    });
  }

  getEndorsersForWork(workSlug, userId) {
    let db = this.getDefaultDB();
    return new Promise((resolve, reject) => {

      db
        .collection('endorsements')
        .find({
          work_slug: workSlug,
          to: new mongodb.ObjectID(userId),
        })
        .toArray((err, result) => {
          if (err) reject(err);
          let itemList = [];

          if (result) {

            result.forEach((endorsementData) => {

              let endorsementObject = new EntityEndorsement(endorsementData);

              itemList.push(endorsementObject.toJson({}));
            })

          }

          resolve (itemList);
        });
    });
  }

  findEndorsementById (id) {

		let db = this.getDefaultDB(),
			endorsement = null;
		return new Promise((resolve, reject) => {

			db.collection('endorsements').findOne({
				_id: new mongodb.ObjectID(id),
			}).then((data) => {

				if (data) {

					endorsement = new EntityEndorsement(data);
				}

				resolve (endorsement);

			}).catch(reject);

		});
	}
	/**
	 * Save endorsement into database.
	 * @param {EntityEndorsement} endorsement - Endorsement entity we are going to register into system.
	 * @returns {Promise}
	 * @resolve {EntityEndorsement}
	 */
	saveEndorsement (endorsement) {

		let db = this.getDefaultDB(),
			collectionName = 'endorsements',
			endorsementData = endorsement.toJson(),
			endorsementEntity;

		if (endorsementData.id == null) {
			delete (endorsementData.id);
		}

		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.insertOne(endorsementData)
				.then((result) => {
					//talentData.id = result.insertedId;
					endorsementEntity = new EntityEndorsement(endorsementData);
					resolve(endorsementEntity);
				})
				.catch(reject);

			});
  }

  // updateUnit(id, data) {
  //   let db = this.getDefaultDB(),
  //     collectionName = 'units',
  //     unit = null;;

	// 	return new Promise((resolve, reject) => {

	// 		db.collection(collectionName)
	// 			.updateOne({_id: new mongodb.ObjectID(id)}, { $set: data })
	// 			.then((result) => {
  //         return db.collection('units').findOne({
  //           _id: new mongodb.ObjectID(id),
  //         });
  //       })
  //       .then((data) => {

  //         if (data) {

  //           unit = new EntityUnit(data);
  //         }

  //         resolve (unit);

  //       })
	// 			.catch(reject);

	// 		});
  // }

  // deleteUnit(id) {
  //   let db = this.getDefaultDB(),
  //     collectionName = 'units';

	// 	return new Promise((resolve, reject) => {

	// 		db.collection(collectionName)
	// 			.deleteOne({_id: new mongodb.ObjectID(id)})
	// 			.then(() => {
  //         resolve();
  //       })
	// 			.catch(reject);

	// 		});
  // }
}

module.exports = EndorsementController;
