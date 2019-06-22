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

  coworkersConnectingMailer = async () => {
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
      await mail.sendCoworkersConnecting(user,coworkersIds.length);
    })
  };

  monthlyDigestMailer= async () => {
    var date = new Date();
    date.setDate(date.getDate() - date.getDate());
    const db = await this.getDatabase();
    const mail = new Mail();
    const distinctLocations = await db.collection('profiles').distinct("location");
    await distinctLocations.forEach( async location => {
      let freelancersSignUpInLocationInLastMonth = await db.collection('profiles').distinct('userId',
        { dateCreated: {$gte: date}, location: location }
      );

      let allFreelancersInLocation = await db.collection('profiles').distinct('userId',{ location: location });
      allFreelancersInLocation = allFreelancersInLocation.map((o) => new mongodb.ObjectID(o));

      const postInLocationInLastMonth = await db.collection('posts').find({
        date_created: { $gte: date }, user: { $in: allFreelancersInLocation }
      }).count();

      const freelancerCount = freelancersSignUpInLocationInLastMonth.length;

      const profilesWithUser = await db.collection('profiles').aggregate([
        { $match : {location: location }
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
            "user": {
              "$filter": {
                "input": "$user",
                "as": "u",
                "cond": { "$eq": [ "$$u.role", "USER" ] }
              }
            }
          }
        }
      ]);
      const city = location.split(',')[0];
      await profilesWithUser.forEach( async profile => {
        if(profile.user.length){
          await mail.sendMonthlyDigest(profile,freelancerCount,postInLocationInLastMonth, city);
        }
      });
    });
  }
}
