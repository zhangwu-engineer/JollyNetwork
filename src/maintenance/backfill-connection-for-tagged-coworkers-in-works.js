const MongoClient = require('mongodb').MongoClient;
const namespace = require('../namespaces');
let Database = require('../services/Database');
const DefaultConfig = require('../config');
var async = require("async");

DefaultConfig(async () => {
  MongoConfig = JOLLY.config.MONGO_DB;
  const url = `mongodb://${MongoConfig.HOST}:${MongoConfig.PORT}/${MongoConfig.DEFAULT_DATABASE}`;

  // Database Name
  const dbName = MongoConfig.DEFAULT_DATABASE;
  const client = new MongoClient(url);
  try {
    // Use connect method to connect to the Server
    await client.connect();
    const db = client.db(dbName);
    let works = await db.collection('works').find({"coworkers": { '$exists': true, '$not': {'$size': 0} }});
    async.eachSeries(works, (work, completed) => {
      async.eachOfLimit(work.coworkers, 1, async (coworker) => {
        await new Promise(async (resolve, reject) => {
          let existingConnection = await db.collection('connections').find({
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
                    "to": work.user.toString(),
                    "from": coworker
                  },
                  {
                    "from": work.user.toString(),
                    "to": coworker
                  }
                ]
              }
            ]
          }).count();
          if (existingConnection === 0) {
            await db.collection('connections').insertOne({
              "to": coworker,
              "from": work.user.toString(),
              "status": "CONNECTED",
              "date_created": new Date(),
              "connectionType": "f2f",
              "isCoworker": true
            });
          }
          resolve({});
        });
      }, () => completed(null));
    });
  } catch (err) {
    console.log(err.stack);
  }

  // client.close();

});
