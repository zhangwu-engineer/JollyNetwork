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
    const files = await db.collection('files').find();
    files.forEach(async (file) => {
      if(file.path && file.path.match('https:\/\/s3-us-west-2\.amazonaws\.com\/jolly-images\/S*')) {
        let updatedPath = file.path.replace(/jolly-images/gi, 'jolly-images-staging');

        let response = await db.collection('files').findOneAndUpdate(
            {_id: file._id},
            {$set: { path: updatedPath}}
          );
        console.log("FILE RESPONSE", response);
      }
    });

    const profiles = await db.collection('profiles').find();
    profiles.forEach(async (profile) => {
      if(profile.avatar && profile.avatar.match('https:\/\/s3-us-west-2\.amazonaws\.com\/jolly-images\/S*')) {
        let updatedPath = profile.avatar.replace(/jolly-images/gi, 'jolly-images-staging');

        let response = await db.collection('profiles').findOneAndUpdate(
          {_id: profile._id},
          {$set: { avatar: updatedPath}}
        );
        console.log("PROFILE RESPONSE", response);
      }
    });

    profiles.forEach(async (profile) => {
      if(profile.backgroundImage && profile.backgroundImage.match('https:\/\/s3-us-west-2\.amazonaws\.com\/jolly-images\/S*')) {
        let updatedPath = profile.backgroundImage.replace(/jolly-images/gi, 'jolly-images-staging');

        let response = await db.collection('profiles').findOneAndUpdate(
          {_id: profile._id},
          {$set: { backgroundImage: updatedPath}}
        );
        console.log("BG RESPONSE", response);
      }
    })
  } catch (err) {
    // console.log(err.stack);
  }

  client.close();

});
