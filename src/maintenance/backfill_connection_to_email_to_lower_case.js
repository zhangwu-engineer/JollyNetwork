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
    let connections = await db.collection('connections').find({to : {$regex : /[A-Z]{1}/ } });
    async.eachOfLimit(connections, 1, async (connection) => {
      console.log(connection);
      await db.collection('connections').updateOne({"_id": new mongodb.ObjectID(connection._id)}, { $set: { "to" : connection.to.toLowerCase() } })
    });
  } catch (err) {
    console.log(err.stack);
  }
});
