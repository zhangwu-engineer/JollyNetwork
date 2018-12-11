/**
 * Unit controller class, in charge of transactions related to user's units.
 */
const mongodb = require('mongodb');

const EntityWork = require('../entities/EntityWork'),
	DbNames = require('../enum/DbNames');


class WorkController {

	/**
     * Controller constructor method.
	 * @returns {WorkController|*}
	 */
	constructor () {

		if ( !WorkController.instance ) {

			WorkController.instance = this;
		}

		return WorkController.instance;
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
	 * create new work.
	 * @param {Object} options
	 * @returns {Promise<Object>}
	 */
	addWork (options) {

		let self = this,
			authService = JOLLY.service.Authentication;

		return new Promise((resolve, reject) => {

			let {title, role, from, to, caption, pinToProfile, coworkers, user_id} = options,
        newWork;

      newWork = new EntityWork({
        title,
        role,
        from,
        to,
        caption,
        pinToProfile,
        coworkers,
        user_id,
			});

      self.saveWork(newWork)
        .then((workData) => {
          resolve (workData.toJson({}));
        })
        .catch(reject)
		});
	}

	listUnits(cb) {

		let Database = JOLLY.service.Db;

		Database.query(DbNames.DB, 'units', (userUnitList) => {

			let itemList = [];

			if (userUnitList) {

				userUnitList.forEach((unitData) => {

					let unitObject = new EntityUnit(unitData);

					itemList.push(unitObject.toJson({}));
				})

			}

			cb(itemList);
		});
  }

  getUserWorks(userId) {
    let db = this.getDefaultDB();
    return new Promise((resolve, reject) => {

      db
        .collection('works')
        .find({
          user_id: new mongodb.ObjectID(userId),
        })
        .toArray((err, result) => {
          if (err) reject(err);
          let itemList = [];

          if (result) {

            result.forEach((workData) => {

              let workObject = new EntityWork(workData);

              itemList.push(workObject.toJson({}));
            })

          }

          resolve (itemList);
        });
    });
  }

  findUnitById (id) {

		let db = this.getDefaultDB(),
			unit = null;
		return new Promise((resolve, reject) => {

			db.collection('units').findOne({
				_id: new mongodb.ObjectID(id),
			}).then((data) => {

				if (data) {

					unit = new EntityUnit(data);
				}

				resolve (unit);

			}).catch(reject);

		});
	}
	/**
	 * Save work into database.
	 * @param {EntityWork} work - work entity we are going to register into system.
	 * @returns {Promise}
	 * @resolve {EntityWork}
	 */
	saveWork (work) {

		let db = this.getDefaultDB(),
			collectionName = 'works',
			workData = work.toJson(),
			workEntity;

		if (workData.id == null) {
			delete (workData.id);
		}

		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.insertOne(workData)
				.then((result) => {
					//talentData.id = result.insertedId;
					workEntity = new EntityWork(workData);
					resolve(workEntity);
				})
				.catch(reject);

			});
  }

  updateUnit(id, data) {
    let db = this.getDefaultDB(),
      collectionName = 'units',
      unit = null;;

		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.updateOne({_id: new mongodb.ObjectID(id)}, { $set: data })
				.then((result) => {
          return db.collection('units').findOne({
            _id: new mongodb.ObjectID(id),
          });
        })
        .then((data) => {

          if (data) {

            unit = new EntityUnit(data);
          }

          resolve (unit);

        })
				.catch(reject);

			});
  }

  deleteUnit(id) {
    let db = this.getDefaultDB(),
      collectionName = 'units';

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

module.exports = WorkController;
