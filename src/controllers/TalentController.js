/**
 * Talent controller class, in charge of transactions related to user's talents.
 */
const mongodb = require('mongodb');

const EntityTalent = require('../entities/EntityTalent'),
	DbNames = require('../enum/DbNames');


class TalentController {

	/**
     * Controller constructor method.
	 * @returns {TalentController|*}
	 */
	constructor () {

		if ( !TalentController.instance ) {

			TalentController.instance = this;
		}

		return TalentController.instance;
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
	 * create new talent.
	 * @param {Object} options
	 * @returns {Promise<Object>}
	 */
	addTalent (options) {

		let self = this,
			authService = JOLLY.service.Authentication;

		return new Promise((resolve, reject) => {

			let {name, rate, unit, user_id} = options,
        newTalent;

      newTalent = new EntityTalent({
        name,
        rate,
        unit,
        user_id,
			});

      self.saveTalent(newTalent)
        .then((talentData) => {
          resolve (talentData.toJson({}));
        })
        .catch(reject)
		});
	}

	listTalents(cb) {

		let Database = JOLLY.service.Db;

		Database.query(DbNames.DB, 'talents', (userTalentList) => {

			let itemList = [];

			if (userTalentList) {

				userTalentList.forEach((talentData) => {

					let talentObject = new EntityTalent(talentData);

					itemList.push(talentObject.toJson({}));
				})

			}

			cb(itemList);
		});
  }

  getUserTalents(userId) {
    let db = this.getDefaultDB();
    return new Promise((resolve, reject) => {

      db
        .collection('talents')
        .find({
          user_id: new mongodb.ObjectID(userId),
        })
        .toArray((err, result) => {
          if (err) reject(err);
          let itemList = [];

          if (result) {

            result.forEach((talentData) => {

              let talentObject = new EntityTalent(talentData);

              itemList.push(talentObject.toJson({}));
            })

          }

          resolve (itemList);
        });
    });
  }

  findTalentById (id) {

		let db = this.getDefaultDB(),
			talent = null;
		return new Promise((resolve, reject) => {

			db.collection('talents').findOne({
				_id: new mongodb.ObjectID(id),
			}).then((data) => {

				if (data) {

					talent = new EntityTalent(data);
				}

				resolve (talent);

			}).catch(reject);

		});
	}
	/**
	 * Save talent into database.
	 * @param {EntityTalent} talent - User entity we are going to register into system.
	 * @returns {Promise}
	 * @resolve {EntityUser}
	 */
	saveTalent (talent) {

		let db = this.getDefaultDB(),
			collectionName = 'talents',
			talentData = talent.toJson(),
			talentEntity;

		if (talentData.id == null) {
			delete (talentData.id);
		}

		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.insertOne(talentData)
				.then((result) => {
					//talentData.id = result.insertedId;
					talentEntity = new EntityTalent(talentData);
					resolve(talentEntity);
				})
				.catch(reject);

			});
  }

  updateTalent(id, data) {
    let db = this.getDefaultDB(),
      collectionName = 'talents',
      talent = null;;

		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.updateOne({_id: new mongodb.ObjectID(id)}, { $set: data })
				.then((result) => {
          return db.collection('talents').findOne({
            _id: new mongodb.ObjectID(id),
          });
        })
        .then((data) => {

          if (data) {

            talent = new EntityTalent(data);
          }

          resolve (talent);

        })
				.catch(reject);

			});
  }

  deleteTalent(id) {
    let db = this.getDefaultDB(),
      collectionName = 'talents',
      talent = null;;

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

module.exports = TalentController;
