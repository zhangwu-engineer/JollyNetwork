/**
 * Main Class To Handle Connection To Mongo Database
 */

const mongodb = require('mongodb');

/**
 * @class Database
 * @property {MongoClient} client
 */
class Database {

    /**
     * Constructor method.
     * @param {Object} options
     * @param {String} [options.host=localhost] - MongoDB hostname / IP address.
     * @param {String} [options.port=27017] - Connection port number.
     * @param {String} [options.username] - MongoDB username.
     * @param {String} [options.password] - MongoDB password.
     * @param {String} [options.authSource] - MongoDB authentication source.
     * @param {String} [options.defaultDatabase] - MongoDB default database.
     * @returns {Database|*}
     */
    constructor (options) {

        if ( !Database.instance ) {

            this.mongoUri = this._generateMongoUri(options);
            Database.instance = this;
        }

        return Database.instance;
    }

    /**
     * Return class instance.
     * @returns {Database}
     */
    static getInstance () {

        if (!Database.instance) {
            throw new Error(`Service is not initiated.`)
        }
        return Database.instance;
    }

    /**
     * Connect to database.
     * @returns {Database}
     * @public
     */
    connect (options) {

        let mongoClient = mongodb.MongoClient,
            mongoUri = this.mongoUri;

        this.onConnectHandler = options.onConnect;

        mongoClient.connect(mongoUri, {
            useNewUrlParser: true
        }, this._setClient);

        return this;
    }

    /**
     * Generate MongoDB connection uri.
     * @param options
     * @returns {string}
     * @private
     */
    _generateMongoUri (options) {

        let mongoHost = options.host || 'localhost',
            mongoPort = options.port || '27017',
            mongoUser = options.username || null,
            mongoPassword = options.password || null,
            authenticationSource = options.authSource || null,
            defaultDatabase = options.defaultDatabase || null,
            mongoUri = `mongodb://`;

        if (mongoUser && mongoPassword) {

            mongoUri += `${encodeURIComponent(mongoUser)}:${encodeURIComponent(mongoPassword)}@`;
        }

        mongoUri += `${mongoHost}:${mongoPort}/`;

        if (defaultDatabase) {
            mongoUri += defaultDatabase;
        }

        if (authenticationSource) {
            mongoUri += `?authSource=${authenticationSource}`;
        }

        return mongoUri;
    }

    /**
     * @type MongoClient~connectCallback
     */
    _setClient (err, client) {


        const dbInstance = Database.instance;

        if (err) throw err;

        dbInstance.client = client;

        console.log ('Connected to database.');

        if (dbInstance.onConnectHandler) {

            dbInstance.onConnectHandler();
        }
    }

    /**
     * Select a database.
     * @param databaseName
     * @return {Db|null}
     * @public
     */
    database (databaseName) {

        let client = this.client,
            db = null;

        if (client) {
            db = client.db(databaseName);
        }

        return db;
    }

    query (dbName, collectionName, callback) {

        let db = this.database(dbName);

        if (db) {

            db.collection(collectionName).find().toArray(function (err, result) {

                if (err) throw err;

                callback( result );
            });
        }
    }

    /**
     * Close connection to database.
     * @public
     */
    close () {

        let client = this.client;

        if (client) {
            client.close();
        }
    }
}

module.exports = Database;

// JOLLY.service.Database = new Db();
// module.exports = JOLLY.service.Database;