/**
 * Unit controller class, in charge of transactions related to user's units.
 */
const mongodb = require('mongodb');
const Analytics = require('analytics-node');
const checkEmail = require('../lib/CheckEmail');
const EntityConnection = require('../entities/EntityConnection'),
  DbNames = require('../enum/DbNames');


class ConnectionController {

	/**
     * Controller constructor method.
	 * @returns {ConnectionController|*}
	 */
	constructor () {

		if ( !ConnectionController.instance ) {

			ConnectionController.instance = this;
		}

		return ConnectionController.instance;
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
	 * create new connection.
	 * @param {Object} options
	 * @returns {Promise<Object>}
	 */
	async addConnection (options) {
    const userController = JOLLY.controller.UserController;
    const mailService = JOLLY.service.Mail;
    const analytics = new Analytics(JOLLY.config.SEGMENT.WRITE_KEY);
    try {
      let {to, from } = options,
      newConnection;

      newConnection = new EntityConnection({
        to,
        from
      });

      const existing = await this.findConnections({ to, from });
      if (existing.length === 0) {
        const connectionData = await this.saveConnection(newConnection);
        const fromUser = await userController.getUserById(from);
        if(checkEmail(to)) {
          await mailService.sendConnectionInvite(to, fromUser);
          analytics.track({
            userId: from,
            event: 'Coworker Request',
            properties: {
              requesterUserId: from,
              invitedUserId: to,
              method: 'Email',
              status: 'Pending',
            }
          });
        } else {
          const toUser = await userController.getUserById(to);
          await mailService.sendConnectionInvite(toUser.email, fromUser);
          analytics.track({
            userId: from,
            event: 'Coworker Request',
            properties: {
              requesterUserId: from,
              invitedUserId: toUser.id.toString(),
              method: 'Nearby',
              status: 'Pending',
            }
          });
        }
        await userController.checkConnectedBadge(from);
        return connectionData.toJson({});
      } else {
        throw new ApiError('Connection request already sent');
      }
    } catch (err) {
      throw new ApiError(err.message);
    }
	}

	listConnections(cb) {

		let Database = JOLLY.service.Db;

		Database.query(DbNames.DB, 'connections', (connections) => {

			let itemList = [];

			if (connections) {

				connections.forEach((connectionData) => {

					let connectionObject = new EntityConnection(connectionData);

					itemList.push(connectionObject.toJson({}));
				})

			}

			cb(itemList);
		});
  }

  findConnections(query) {
    let db = this.getDefaultDB();
    return new Promise((resolve, reject) => {

      db
        .collection('connections')
        .find(query)
        .sort({ date_created: -1 })
        .toArray((err, result) => {
          if (err) reject(err);
          let itemList = [];

          if (result) {

            result.forEach((connectionData) => {

              let connectionObject = new EntityConnection(connectionData);

              itemList.push(connectionObject.toJson({}));
            })

          }

          resolve (itemList);
        });
    });
  }

  findConnectionById (id) {

		let db = this.getDefaultDB(),
			connection = null;
		return new Promise((resolve, reject) => {

			db.collection('connections').findOne({
				_id: new mongodb.ObjectID(id),
			}).then((data) => {

				if (data) {

					connection = new EntityConnection(data);
				}

				resolve (connection);

			}).catch(reject);

		});
	}
	/**
	 * Save connection into database.
	 * @param {EntityConnection} connection - Connection entity we are going to register into system.
	 * @returns {Promise}
	 * @resolve {EntityConnection}
	 */
	saveConnection (connection) {

		let db = this.getDefaultDB(),
			collectionName = 'connections',
			connectionData = connection.toJson(),
			connectionEntity;

		if (connectionData.id == null) {
			delete (connectionData.id);
		}

		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.insertOne(connectionData)
				.then((result) => {
					//talentData.id = result.insertedId;
					connectionEntity = new EntityConnection(connectionData);
					resolve(connectionEntity);
				})
				.catch(reject);

			});
  }

  updateConnection(id, userId, data) {
    let db = this.getDefaultDB(),
      collectionName = 'connections',
      connection = null;
    const analytics = new Analytics(JOLLY.config.SEGMENT.WRITE_KEY);

		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.updateOne({_id: new mongodb.ObjectID(id)}, { $set: data })
				.then((result) => {
          return db.collection('connections').findOne({
            _id: new mongodb.ObjectID(id),
          });
        })
        .then((data) => {

          if (data) {
            connection = new EntityConnection(data);
            const method = checkEmail(data.to) ? 'Email' : 'Nearby';
            analytics.track({
              userId: userId,
              event: 'Coworker Request',
              properties: {
                requesterUserId: data.from,
                invitedUserId: data.to,
                method: method,
                status: 'Accepted',
              }
            });

            resolve (connection);
          }

          reject(new ApiError('invalid connection id'));

        })
				.catch(reject);

			});
  }

  deleteConnection(id, userId) {
    let db = this.getDefaultDB(),
      connection = null,
      collectionName = 'connections';
    const analytics = new Analytics(JOLLY.config.SEGMENT.WRITE_KEY);

		return new Promise((resolve, reject) => {
      db
        .collection(collectionName)
        .findOne({
          _id: new mongodb.ObjectID(id),
        })
        .then(data => {
          connection = data;
          return db.collection(collectionName).deleteOne({_id: new mongodb.ObjectID(id)});
        })
				.then(() => {
          const method = checkEmail(connection.to) ? 'Email' : 'Nearby';
          analytics.track({
            userId: userId,
            event: 'Coworker Request',
            properties: {
              requesterUserId: connection.from,
              invitedUserId: connection.to,
              method: method,
              status: 'Ignored',
            }
          });
          resolve();
        })
				.catch(reject);

			});
  }
}

module.exports = ConnectionController;
