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

  getDatabase() {
    return new Promise((resolve, reject) => {
      let db = null;
      config(() => {
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

  async monthlyDigestMailer() {
    var date = new Date();
    date.setDate(date.getDate() - date.getDate());
    const db = await this.getDatabase();
    const mail = new Mail();
    const allFreelancersSignUpIn30days = await db.collection('profiles').find({ dateCreated: { $gte: date } }).count();
    const allPostCountIn30days = await db.collection('posts').find({ date_created: { $gte: date } }).count();
    const distinctLocations = await db.collection('profiles').distinct("location");
    await distinctLocations.forEach(async location => {
      let allFreelancersSignUpInLocationIn30days = await db.collection('profiles').distinct('userId',
        { dateCreated: { $gte: date }, location: location, }
      );
      const freelancerCount = allFreelancersSignUpInLocationIn30days.length;

      const allFreelancersInLocation = await db.collection('profiles').aggregate([
        {
          $match: { location: location }
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
                "cond": { "$eq": ["$$u.role", "USER"] }
              }
            }
          }
        },
        {
          $match: { "user": { $not: { $size: 0 } } }
        }
      ]).toArray();

      let allFreelancersIdsInLocation = [];

      await async.eachOfLimit(allFreelancersInLocation, 1, async (object) => {
        await new Promise(async (resolve, reject) => {
          resolve(allFreelancersIdsInLocation.push(new mongodb.ObjectID(object.userId)));
        });
      });

      const postCountInLocationIn30days = await db.collection('posts').find({
        date_created: { $gte: date }, user: { $in: allFreelancersIdsInLocation }
      }).count();

      const city = location.split(',')[0];

      await async.eachOfLimit(allFreelancersInLocation, 1, async (profile) => {
        if(profile.receiveMonthlyUpdates === undefined || profile.receiveMonthlyUpdates === true ) {
          await mail.sendMonthlyDigest(profile.user[0].email, profile.avatar,
            freelancerCount, postCountInLocationIn30days, city,
            allFreelancersSignUpIn30days, allPostCountIn30days);
        }
      });
      console.log(`"${location}", ${allFreelancersIdsInLocation.length}, ${freelancerCount}, ${postCountInLocationIn30days}`);
    });
    db.close();
  }
}

module.exports = MarketingEmails;
