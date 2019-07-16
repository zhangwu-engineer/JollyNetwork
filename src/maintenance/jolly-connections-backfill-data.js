const MongoClient = require('mongodb').MongoClient;
const namespace = require('../namespaces');
let Database = require('../services/Database');
const DefaultConfig = require('../config');

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
    let connections = await db.collection('connections').find({connectionType: undefined});
    connections.forEach(async (connection) => {
      if(connection.connectionType === undefined) {
        console.log(connection);
        let response = await db.collection('connections').findOneAndUpdate(
          {_id: connection._id},
          {$set: { connectionType: 'f2f'}}
        );
        console.log("CONNECTIONS RESPONSE", response);
      }
    });
    connections = await db.collection('connections').find({isCoworker: undefined});
    connections.forEach(async (connection) => {
      if(connection.isCoworker === undefined) {
        console.log(connection);
        let response = await db.collection('connections').findOneAndUpdate(
          {_id: connection._id},
          {$set: { isCoworker: false}}
        );
        console.log("CONNECTIONS RESPONSE", response);
      }
    });
  } catch (err) {
    console.log(err.stack);
  }

  // client.close();

});
