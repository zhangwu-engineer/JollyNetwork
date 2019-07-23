require('../namespaces');
const config = require('../config');
let Database = require('../services/Database');
const DbNames = require('../enum/DbNames');
const Promise = require('bluebird');
const mongodb = require('mongodb');
const async = require('async');
const Mail = require('../services/Mail');

class MarketingEmails {
  constructor() {
  }

  getDatabase () {
    return new Promise((resolve, reject) => {
      let db = null;
      config( () => {
        const MongoConfig = JOLLY.config.MONGO_DB;
        new Database({
          host: MongoConfig.HOST,
          port: MongoConfig.PORT,
          username: MongoConfig.USER,
          password: MongoConfig.PASS,
          authSource: MongoConfig.AUTH_SRC,
          defaultDatabase: MongoConfig.DEFAULT_DATABASE
        }).connect({
          onConnect: () => {
            db = Database.getInstance();
            resolve(db.database(DbNames.DB));
          }
        })
      });
    });
  }

  async coworkersConnectingMailer() {
    const db = await this.getDatabase();
    const mail = new Mail();
    let date = new Date();
    date.setDate(date.getDate() - 14);
    const connections = await db.collection('connections').aggregate([{
      $match : {
        date_created: {$gte: date},
        status: 'CONNECTED',
        isCoworker: true
      }
    }]);
    let coworkersIds = [];
    await connections.forEach((connection) => {
      if (connection.from != null) {
        if (!coworkersIds.includes(connection.from)) {
          coworkersIds.push(connection.from);
        }
      }
      if (connection.to != null) {
        if (!coworkersIds.includes(connection.to)) {
          coworkersIds.push(connection.to);
        }
      }
    });
    coworkersIds = coworkersIds.map((o) => new mongodb.ObjectID(o));
    const users = await db.collection('users').aggregate([
      {
        $match : {
          _id : { $nin : coworkersIds},
          date_created: {$gte: date},
          role: "USER"
        }
      },
      {
        $lookup:
          {
            from: 'profiles',
            localField: '_id',
            foreignField: 'userId',
            as: 'profile'
          }
      },
      {
        $unwind: '$profile'
      }
    ]);
    if(coworkersIds.length > 0) {
      await async.eachOfLimit(users, 10, async (user) => {
        if(user.profile.receiveMonthlyUpdates === undefined || user.profile.receiveMonthlyUpdates === true ) {
          await mail.sendCoworkersConnecting(user.email, user, coworkersIds.length);
        }
      });
    }
  }
}

module.exports = MarketingEmails;
