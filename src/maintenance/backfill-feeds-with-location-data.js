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

    let posts = await db.collection('posts').find();

    async.eachOfLimit(posts, 1, async (post) => {
      if(post.location) {
        let location = await geocode(post.location);
        console.log(location);
        db.collection('posts').updateOne(
          { "_id": post._id},
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
    });

  } catch (err) {
    console.log(err.stack);
  }

  // client.close();

});
