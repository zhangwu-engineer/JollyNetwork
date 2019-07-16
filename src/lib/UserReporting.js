require('../namespaces');
const json2csv = require('json2csv').parse;
const AWS = require('aws-sdk');
const config = require('../config');
let Database = require('../services/Database');
const DbNames = require('../enum/DbNames');
const Promise = require('bluebird');
const mongodb = require('mongodb');
const UserController = require('../controllers/UserController');
const ConnectionController = require('../controllers/ConnectionController');

class UserReporting {

  constructor() {
    this.userController = new UserController();
  }

  async getDatabase () {
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
            JOLLY.controller.ConnectionController = new ConnectionController();
            resolve(JOLLY.service = { Db: Database.getInstance()});
          }
        })
      });
    });
  }

  exportUsersCsv = async () => {
    await this.getDatabase();
    try {
      AWS.config.update({ accessKeyId: JOLLY.config.AWS.REPORTING_AWS_ACCESS_KEY_ID, secretAccessKey: JOLLY.config.AWS.REPORTING_AWS_SECRET_ACCESS_KEY });
      const S3 = new AWS.S3();
      const users = await this.userController.searchUsers({});
      const fields = [
        { label: 'Email', value: 'email'},
        { label: 'First', value: 'firstName'},
        { label: 'Last', value: 'lastName'},
        { label: 'City', value: 'city'},
        { label: 'Connections', value: 'connections'},
        { label: 'Trusted', value: 'trusted'},
        { label: 'Jobs', value: 'jobs'},
        { label: 'All Position', value: 'allPosition'},
        { label: 'Top Position', value: 'topPosition'},
        { label: '2nd Top Position', value: 'top2ndPosition'},
        { label: 'Posts', value: 'posts'},
        { label: 'Coworkers', value: 'coworkers'},
        { label: 'Created On', value: 'date_created'}
      ];
      const csvData = await json2csv(users.data, {fields});
      const date = new Date().toISOString().split(/[TZ]/).slice(0, 1).join(' ');
      const environment = JOLLY.config.APP.APP_DOMAIN.replace('https://','');
      const filePath = 'daily-user-report/user-'+environment+'-'+date+'.csv';
      const params = {
        Bucket: 'jolly-reports',
        Key: filePath,
        Body: csvData,
        ContentType: 'application/octet-stream'
      };
      await S3.putObject(params).promise();
    } catch (e) {
      console.log(e)
    }
  };
}

module.exports = UserReporting;
