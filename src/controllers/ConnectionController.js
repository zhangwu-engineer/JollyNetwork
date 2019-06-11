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
      let {to, toUserId, isCoworker, from, email, fromUserId, connectionType } = options,
      newConnection;

      if (!to) to = toUserId;
      if (!from) from = fromUserId;
      if (!connectionType) connectionType='f2f';

      newConnection = new EntityConnection({
        to: to,
        from: from,
        connectionType: isCoworker ? 'coworker' : 'generic',
        isCoworker: isCoworker
      });

      let fromUser;
      if (fromUserId) {
        fromUser = await userController.getUserById(fromUserId);
      } else if (!fromUserId && email) {
        fromUser = await userController.getUserByEmail(email);
        fromUserId = fromUser.id;
      } else {
        throw new ApiError('User not found');
      }

      const existing = await this.findConnections({
        to, from, status: [ ConnectionStatus.CONNECTED, ConnectionStatus.PENDING]
      });

      if (existing.length === 0) {
        const connectionData = await this.saveConnection(newConnection);
        if(checkEmail(toUserId)) {
          await mailService.sendConnectionInvite(toUserId, fromUser);
          analytics.track({
            userId: fromUserId,
            event: 'Coworker Request',
            properties: {
              requesterUserId: fromUserId,
              invitedUserId: toUserId,
              method: 'Email',
              status: 'Pending',
            }
          });
        } else {
          const toUser = await userController.getUserById(toUserId);
          await mailService.sendConnectionInvite(toUser.email, fromUser);
          analytics.track({
            userId: fromUserId,
            event: 'Coworker Request',
            properties: {
              requesterUserId: fromUserId,
              invitedUserId: toUser.id.toString(),
              method: 'Nearby',
              status: 'Pending',
            }
          });
        }
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
<<<<<<< HEAD
=======

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
>>>>>>> feature/business
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
            if(connection.status === ConnectionStatus.CONNECTED) {
              const method = checkEmail(data.to) ? 'Email' : 'Nearby';
              analytics.track({
                userId: userId, event: 'Coworker Request',
                properties: {
                  requesterUserId: data.from,
                  invitedUserId: data.to,
                  method: method,
                  status: 'Accepted',
                }
              });
            }

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
