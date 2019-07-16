const mongodb = require('mongodb');
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
    let connections = await db.collection('connections').find({to : {$regex : /^[a-z]{1}/ } });
    async.eachOfLimit(connections, 1, async (connection) => {
      let user = await db.collection('users').findOne({"email": connection.to});
      console.log(connection.to, user);
      if(user) {
        await db.collection('connections').updateOne({"_id": new mongodb.ObjectID(connection._id)}, { $set: { "to" : user._id.toString() } })
      }
    });
  } catch (err) {
    console.log(err.stack);
  }
});
