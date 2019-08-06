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
    let { to, toUserId, isCoworker, from, email, fromUserId, connectionType, headers } = options,
      newConnection;
    const connectionAnalytics = new ConnectionAnalytics(JOLLY.config.SEGMENT.WRITE_KEY, headers);
    const userController = JOLLY.controller.UserController;
    const businessController = JOLLY.controller.BusinessController;
    const mailService = JOLLY.service.Mail;

    try {

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
        else {
          const toBusiness = await businessController.getBusinessById(to);
          if (toBusiness) {
            toUser = await userController.getUserById(toBusiness.user.toString());
          }
        }

        if(checkEmail(to)) {
          await mailService.sendConnectionInvite(to, fromUser);
        } else {
          await mailService.sendConnectionInvite(toUser.email, fromUser);
        }

        connectionAnalytics.send(connectionData.toJson({}), { userId: fromUserId, isCoworker, toUserId: toUser.id });
        await userController.checkConnectedBadge(fromUserId, headers);

        return connectionData.toJson({});
      } else if (existing[0].isCoworker !== isCoworker && isCoworker) {
        const params = { id: existing[0].id, data: { isCoworker: isCoworker }, headers: headers };
        await this.updateConnection(params)
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

  updateConnection(options) {
	  const { id, userId, data, headers } = options;
    let db = this.getDefaultDB(),
      collectionName = 'connections',
      connection = null;
    const connectionAnalytics = new ConnectionAnalytics(JOLLY.config.SEGMENT.WRITE_KEY, headers);
    const userController = JOLLY.controller.UserController;
    const businessController = JOLLY.controller.BusinessController;

		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.updateOne({_id: new mongodb.ObjectID(id)}, { $set: data })
				.then((result) => {
          return db.collection('connections').findOne({
            _id: new mongodb.ObjectID(id),
          });
        })
        .then(async (data) => {
          if (data) {
            connection = new EntityConnection(data);
            let toUserId = connection.to;
            if (connection.connectionType === 'f2b') {
              const toBusiness = await businessController.getBusinessById(connection.to);
              if (toBusiness) {
                let toUser = await userController.getUserById(toBusiness.user.toString());
                toUserId = toUser.id;
              }
            }
            connectionAnalytics.send(data, { userId, toUserId });
            resolve (connection);
          }

          reject(new ApiError('invalid connection id'));

        })
				.catch(reject);

			});
  }

  deleteConnection(options) {
	  const { id, userId, headers } = options;
    const connectionAnalytics = new ConnectionAnalytics(JOLLY.config.SEGMENT.WRITE_KEY, headers);
    const userController = JOLLY.controller.UserController;
    const businessController = JOLLY.controller.BusinessController;
    let db = this.getDefaultDB(),
      connection = null,
      collectionName = 'connections';

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
				.then(async () => {
          let toUserId = connection.to;
          if (connection.connectionType === 'f2b') {
            const toBusiness = await businessController.getBusinessById(connection.to);
            if (toBusiness) {
              let toUser = await userController.getUserById(toBusiness.user.toString());
              toUserId = toUser.id;
            }
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

  getUserConnectionsCount(userId, options = {}) {
    let db = this.getDefaultDB();
    let searchQuery = {
      $and: [
        { status: "CONNECTED" },
        {
          $or: [
            { to: userId.toString() },
            { from: userId.toString() }
          ]
        }
      ]
    };
    if(Object.keys(options).length > 0) {
      if (options.connectionType.length > 0) {
        searchQuery.$and.push({
          connectionType: { $in: options.connectionType }
        })
      }
      if (options.hasOwnProperty('isCoworker')) {
        searchQuery.$and.push({
          isCoworker: options.isCoworker
        })
      }
    }

    return new Promise(async (resolve, reject) => {
      let postCount = await db.collection('connections')
        .find(searchQuery).count();
      resolve(postCount);
    });
  }
}

module.exports = ConnectionController;
