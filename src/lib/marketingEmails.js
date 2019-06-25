require('../namespaces');
const config = require('../config');
let Database = require('../services/Database');
const DbNames = require('../enum/DbNames');
const Promise = require('bluebird');
const mongodb = require('mongodb');
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
    var date = new Date();
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
        if (!coworkersIds.includes(connection.from)){
          coworkersIds.push(connection.from);
        }
      }
      if (connection.to != null) {
        if (!coworkersIds.includes(connection.to)){
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
    let onOfUserWillGetEmail = 0;
    const testEmail1 = "ronakjain90@gmail.com";
    const testEmail2 = "lalitkumarjiet@gmail.com";
    await users.forEach(async (user)=> {
      onOfUserWillGetEmail += 1;
      if(onOfUserWillGetEmail == 1){
        await mail.sendCoworkersConnecting(testEmail1, user,coworkersIds.length);
        await mail.sendCoworkersConnecting(testEmail2, user,coworkersIds.length);
      }
    });
    console.log(onOfUserWillGetEmail);
  }
}

module.exports = MarketingEmails;
