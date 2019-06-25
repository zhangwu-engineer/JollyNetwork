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
    var date = new Date();
    date.setDate(date.getDate() - 14);
    const connections = await db.collection('connections').aggregate([{
      $match : {
        date_created: {$gte: date},
        status: 'CONNECTED',
        connectionType: 'f2f',
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
    await users.forEach(async (user)=> {
      // await mail.sendCoworkersConnecting(user,coworkersIds.length);
    })
  };

  async monthlyDigestMailer() {
    let isSendMail = true;
    var date = new Date();
    date.setDate(date.getDate() - date.getDate());
    const db = await this.getDatabase();
    const mail = new Mail();
    const distinctLocations = await db.collection('profiles').distinct("location");
    await distinctLocations.forEach( async location => {
      let allFreelancersSignUpInLocationIn30days = await db.collection('profiles').distinct('userId',
        { dateCreated: {$gte: date}, location: location,}
      );
      const freelancerCount = allFreelancersSignUpInLocationIn30days.length;

      const allFreelancersInLocation = await db.collection('profiles').aggregate([
        {
          $match : {location: location }
        },
        {
          $lookup:
            {
              from: 'users',
              localField: 'userId',
              foreignField: '_id',
              as: 'user'
            }
        },
        {
          $project: {
            'avatar': '$avatar',
            'userId': '$userId',
            "user": {
              "$filter": {
                "input": "$user",
                "as": "u",
                "cond": {"$eq": ["$$u.role", "USER"]}
              }
            }
          }
        },
        {
          $match: { "user": { $not: { $size: 0}}}
        }
      ]);

      let allFreelancersIdsInLocation = [];

      await async.eachOfLimit(allFreelancersInLocation, 1, async (object) => {
        await new Promise(async (resolve, reject) => {
          resolve(allFreelancersIdsInLocation.push(new mongodb.ObjectID(object.userId)));
        });
      });

      const postCountInLocationIn30days = await db.collection('posts').find({
        date_created: { $gte: date }, user: { $in: allFreelancersIdsInLocation}
      }).count();

      const city = location.split(',')[0];

      await async.eachOfLimit(allFreelancersInLocation, 1, async (profile) => {
        if (isSendMail && (freelancerCount > 1 || postCountInLocationIn30days > 1)) {
          isSendMail = false;
          const testEmail1 = 'lalitkumarjiet@gmail.com';
          await mail.sendMonthlyDigest(testEmail1, profile.avatar, freelancerCount - 1, postCountInLocationIn30days, city);
        }
      });
      console.log(`"${location}", ${allFreelancersIdsInLocation.length}, ${freelancerCount}, ${postCountInLocationIn30days}`);
    });
  }
}

module.exports = MarketingEmails;
