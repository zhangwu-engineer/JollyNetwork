/**
 * Token controller class, in charge of transactions related to tokens.
 */
const mongodb = require('mongodb');

const EntityToken = require('../entities/EntityToken'),
	DbNames = require('../enum/DbNames');


class TokenController {

	/**
     * Controller constructor method.
	 * @returns {TalentController|*}
	 */
	constructor () {

		if ( !TokenController.instance ) {

			TokenController.instance = this;
		}

		return TokenController.instance;
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
	addToken (options) {

    let self = this;

		return new Promise((resolve, reject) => {

			let { token } = options,
        newToken;

        newToken = new EntityToken({ token });

      self.saveToken(newToken)
        .then((tokenData) => {
          resolve (tokenData.toJson({}));
        })
        .catch(reject)
		});
  }

  verify (token) {
    let self = this,
      db = this.getDefaultDB(),
			collectionName = 'tokens';

		return new Promise((resolve, reject) => {
			db.collection(collectionName)
				.findOne({ token })
				.then((data) => {
					if ( data ) {
            return self.deleteToken(data._id);
          } else {
            reject(new ApiError('invalid token'));
          }
        })
        .then(() => {
          resolve();
        })
				.catch(reject);
		});
  }
	/**
	 * Save token into database.
	 * @param {EntityToken} token - token we are going to register into system.
	 * @returns {Promise}
	 * @resolve {EntityToken}
	 */
	saveToken (token) {

		let db = this.getDefaultDB(),
			collectionName = 'tokens',
			tokenData = token.toJson(),
			tokenEntity;

		if (tokenData.id == null) {
			delete (tokenData.id);
		}

		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.insertOne(tokenData)
				.then((result) => {
					//talentData.id = result.insertedId;
					tokenEntity = new EntityToken(tokenData);
					resolve(tokenEntity);
				})
				.catch(reject);

			});
  }

  deleteToken(id) {
    let db = this.getDefaultDB(),
      collectionName = 'tokens';

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

module.exports = TokenController;
