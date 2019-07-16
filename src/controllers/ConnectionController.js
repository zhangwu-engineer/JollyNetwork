/**
 * Unit controller class, in charge of transactions related to user's units.
 */
const mongodb = require('mongodb');
const checkEmail = require('../lib/CheckEmail');
const Analytics = require('analytics-node');
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
    const analytics = new Analytics(JOLLY.config.SEGMENT.WRITE_KEY);

    try {
      let {to, toUserId, isCoworker, from, email, fromUserId, connectionType } = options,
      newConnection;

      if (!to) {
        if(toUserId) to = toUserId;
        if (email) {
          const invitedUser = await userController.getUserByEmailIfExists(email.toLowerCase());
          if (invitedUser) {
            toUserId = invitedUser.id.toString();
            to = invitedUser.id.toString();
          }
          if(!invitedUser) to = email.toLowerCase();
        }
      }

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

      const existing = await this.findConnectionsBetweenUserIds([to, from]);

      if (existing.length === 0) {
        const connectionData = await this.saveConnection(newConnection);

        let toUser = null;
        if (toUserId) toUser = await userController.getUserById(toUserId);
        else toUser = await userController.getUserByBusinessId(to);

        if(checkEmail(to)) {
          await mailService.sendConnectionInvite(to, fromUser);
        } else {
          await mailService.sendConnectionInvite(toUser.email, fromUser);
        }

        connectionAnalytics.send(connectionData.toJson({}), { userId: fromUserId, isCoworker, toUserId: toUser.id });
        await userController.checkConnectedBadge(fromUserId);

        return connectionData.toJson({});
      } else if (existing[0].isCoworker !== isCoworker && isCoworker) {
        await this.updateConnection(existing[0].id, '', {isCoworker: isCoworker})
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
				resolve (connection.toJson({}));

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
            let toUserId = connection.to;
            if (connection.connectionType === 'f2b') {
              let toUser = userController.getUserByBusinessId(connection.to);
              toUserId = toUser.id;
            }
            connectionAnalytics.send(data, { userId, toUserId });
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
          let toUserId = connection.to;
          if (connection.connectionType === 'f2b') {
            let toUser = userController.getUserByBusinessId(connection.to);
            toUserId = toUser.id;
          }
				  connectionAnalytics.send(connection, { userId, toUserId, ignored: true });
          resolve();
        })
				.catch(reject);

			});
  }

  createCoworkerConnection(to, from) {
    let db = this.getDefaultDB(),
      collectionName = 'connections',
      connection = null;
    const self = this;

    return new Promise(async (resolve, reject) => {
      const existingConnection = await self.findConnectionsBetweenUserIds([to, from]);
      if(existingConnection.length === 0) {
        let newConnection = new EntityConnection({
          to: to,
          from: from,
          connectionType: 'f2f',
          status: "CONNECTED",
          isCoworker: true
        });
        await this.saveConnection(newConnection);
        resolve({});
      } else {
        resolve({});
      }
    });
  }
}

module.exports = ConnectionController;
