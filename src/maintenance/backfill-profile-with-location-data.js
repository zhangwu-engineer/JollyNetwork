const MongoClient = require('mongodb').MongoClient;
const namespace = require('../namespaces');
let Database = require('../services/Database');
const geocode = require('../lib/geocode');
const DefaultConfig = require('../config');
const async = require("async");

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

    let profiles = await db.collection('profiles').find({}).toArray();

    async.eachOfLimit(profiles, 10, async (profile) => {
      console.log(profile._id);
      if(profile.location) {
        let location = await geocode(profile.location);
        if(location.hasOwnProperty(lng)) {
          await db.collection('profiles').updateOne(
            { "_id": profile._id},
            {
              $set: {
                geo_location: {
                  coordinates : [
                    location.lng,
                    location.lat
                  ],
                  type : "Point"
                }
              }
            }
          );
        }
      }
    }, (err) => console.log(err));

  } catch (err) {
    console.log(err.stack);
  }

  // client.close();

});
