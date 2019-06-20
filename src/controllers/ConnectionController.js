/**
 * Unit controller class, in charge of transactions related to user's units.
 */
const mongodb = require('mongodb');
const checkEmail = require('../lib/CheckEmail');
const ConnectionAnalytics = require('../analytics/connection');
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
    const connectionAnalytics = new ConnectionAnalytics(JOLLY.config.SEGMENT.WRITE_KEY);
    const userController = JOLLY.controller.UserController;
    const mailService = JOLLY.service.Mail;

    try {
      let {to, toUserId, isCoworker, from, email, fromUserId, connectionType } = options,
      newConnection;

      if (!to) to = toUserId || email;
      if (!from) from = fromUserId;
      if (!connectionType) connectionType='f2f';
      if (isCoworker === undefined) isCoworker = (email && email.length > 0) ? true : false;

      newConnection = new EntityConnection({
        to: to,
        from: from,
        connectionType: connectionType,
        isCoworker: isCoworker
      });

      let fromUser;
      if (fromUserId) {
        fromUser = await userController.getUserById(fromUserId);
      } else {
        throw new ApiError('User not found');
      }

      const existing = await this.findConnections({
        to, from, status: [ ConnectionStatus.CONNECTED, ConnectionStatus.PENDING]
      });

      if (existing.length === 0) {
        const connectionData = await this.saveConnection(newConnection);

        if(checkEmail(to)) {
          await mailService.sendConnectionInvite(to, fromUser);
        } else {
          let toUser = await userController.getUserById(toUserId);
          await mailService.sendConnectionInvite(toUser.email, fromUser);
        }
        connectionAnalytics.send(connectionData.toJson({}), { userId: fromUserId});

        await userController.checkConnectedBadge(fromUserId);
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

	findConnectionsBetweenUserIds (userIds) {
    let db = this.getDefaultDB();
    return new Promise((resolve, reject) => {
      db.collection('connections')
        .find({
          "$and": [
            {
              "$or": [
                {
                  "status": "CONNECTED"
                },
                {
                  "status": "PENDING"
                }
              ]
            },
            {
              "$or": [
                {
                  "to": userIds[0],
                  "from": userIds[1]
                },
                {
                  "from": userIds[0],
                  "to": userIds[1]
                }
              ]
            }
          ]
        })
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
    const connectionAnalytics = new ConnectionAnalytics(JOLLY.config.SEGMENT.WRITE_KEY);

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
            connectionAnalytics.send(data, { userId: userId });
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
    const connectionAnalytics = new ConnectionAnalytics(JOLLY.config.SEGMENT.WRITE_KEY);

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
				  connectionAnalytics.send(connection, { userId: userId, ignored: true });
          resolve();
        })
				.catch(reject);

			});
  }
}

module.exports = ConnectionController;
