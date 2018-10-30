/**
 * Unit controller class, in charge of transactions related to user's units.
 */
const mongodb = require('mongodb');

const EntityUnit = require('../entities/EntityUnit'),
	DbNames = require('../enum/DbNames');


class UnitController {

	/**
     * Controller constructor method.
	 * @returns {UnitController|*}
	 */
	constructor () {

		if ( !UnitController.instance ) {

			UnitController.instance = this;
		}

		return UnitController.instance;
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
	 * create new unit.
	 * @param {Object} options
	 * @returns {Promise<Object>}
	 */
	addUnit (options) {

		let self = this,
			authService = JOLLY.service.Authentication;

		return new Promise((resolve, reject) => {

			let {name, user_id} = options,
        newUnit;

      newUnit = new EntityUnit({
        name,
        user_id,
			});

      self.saveUnit(newUnit)
        .then((unitData) => {
          resolve (unitData.toJson({}));
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

  getUserUnits(userId) {
    let db = this.getDefaultDB();
    return new Promise((resolve, reject) => {

      db
        .collection('units')
        .find({
          user_id: new mongodb.ObjectID(userId),
        })
        .toArray((err, result) => {
          if (err) reject(err);
          let itemList = [];

          if (result) {

            result.forEach((unitData) => {

              let unitObject = new EntityUnit(unitData);

              itemList.push(unitObject.toJson({}));
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
	 * Save unit into database.
	 * @param {EntityUnit} unit - Unit entity we are going to register into system.
	 * @returns {Promise}
	 * @resolve {EntityUnit}
	 */
	saveUnit (unit) {

		let db = this.getDefaultDB(),
			collectionName = 'units',
			unitData = unit.toJson(),
			unitEntity;

		if (unitData.id == null) {
			delete (unitData.id);
		}

		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.insertOne(unitData)
				.then((result) => {
					//talentData.id = result.insertedId;
					unitEntity = new EntityUnit(unitData);
					resolve(unitEntity);
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

module.exports = UnitController;
