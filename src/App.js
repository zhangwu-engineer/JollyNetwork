/**
 * Server Handler Class
 */

const express = require('express');
const bodyParser = require('body-parser');
const ApiError = require('./lib/ApiError');
const passport = require('passport');
const FacebookTokenStrategy = require('passport-facebook-token');
const LinkedInTokenStrategy = require('./lib/LinkedInStrategy');

/** Define/Import system defined dependencies */
let Database = require('./services/Database'),
	Authentication = require('./services/Authentication'),
	UserController = require('./controllers/UserController');


class App {

	/**
	 * Application Server Constructor
	 * @returns {App}
	 */
	constructor () {

		console.log ('Initiating application.');

		if ( !App.instance ) {

			let self = this,
				MongoConfig = JOLLY.config.MONGO_DB;

			App.instance = this;

			/** Initiate Express Application
			 * @type Express
			 */
			this.app = express();

			/** Connect to Database and initiate application */
			new Database({
				host: MongoConfig.HOST,
				port: MongoConfig.PORT,
				username: MongoConfig.USER,
				password: MongoConfig.PASS,
				authSource: MongoConfig.AUTH_SRC,
				defaultDatabase: MongoConfig.DEFAULT_DATABASE
			}).connect({
				onConnect: () => {

					/** Load Application Services */
					self._loadServices();

					/** Load Application Controllers */
					self._loadControllers();

					/** Initiate Application */
					self.init();
				}
			});
		}

		return App.instance;
	}

	/**
	 * Initiate application.
	 * @param {Object} [options]
	 * @returns {App}
	 */
	init (options) {

		let appExpress = this.app,
			AppConfig = JOLLY.config.APP;

		/** Define ApiError in global namespace to prevent importing in other classes/modules */
		global.ApiError = ApiError;

		appExpress.disable('etag');

		/** Enable CORS */
		appExpress.use(function(req, res, next){
			res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
			res.header('Access-Control-Allow-Headers', 'Content-Type, Cache-Control, x-access-token');
			res.header('Access-Control-Allow-Origin', '*');
			next();
		});

		/** Define API Response structure */
		appExpress.use(this._apiResponse);

		/** Load middlewares */
		this._configureMiddleware();

		/** Load defined routes */
		this._defineRoutes();

		/** Initiate express server */
		this.start({
			ip: AppConfig.BIND_IP,
			port: AppConfig.BIND_PORT
		});

		return this;
	}

	/**
	 * Load application services.
	 * @private
	 */
	_loadServices () {

		console.log ('Loading application services...');

		JOLLY.service = {

			/** Assign Db service */
			Db: Database.getInstance(),

			/** Initiate Authentication Service */
			Authentication: new Authentication()
		};
	}

	/**
	 * Load application services.
	 * @private
	 */
	_loadControllers () {

		console.log ('Loading application controllers...');

		JOLLY.controller = {

			/** User controller */
			UserController: new UserController()
		};
	}

	/**
	 * Define standard api output structure.
	 * @param req
	 * @param res
	 * @param next
	 * @private
	 */
	_apiResponse (req, res, next) {

		let threadStart = Date.now(),
			executeTime = () => {
				let threadEnd = Date.now();
				return ((threadEnd - threadStart) / 1000).toFixed(3);
			},
			createResponse = (isSuccess) => {

				return {
					success: isSuccess,
					executeTime: executeTime()
				}
			};

		res.createResponse = createResponse;

		res.apiSuccess = (data, statusCode) => {

			let responseStatus = statusCode || 200,
				responseData = createResponse (true);

			responseData.response = data;

			res.status(responseStatus).json(responseData);
		};

		next();
	}

	/**
	 * Define application-wise middlewares
	 * @private
	 */
	_configureMiddleware () {

		const appExpress = this.app,
			config = JOLLY.config;

		appExpress.use(bodyParser.urlencoded({ extended: true }));
		appExpress.use(bodyParser.json());

		appExpress.use(passport.initialize());
		passport.serializeUser(function(user, done) {
			done(null, user);
		});

		passport.deserializeUser(function(user, done) {
			done(null, user);
		});
		passport.use(new FacebookTokenStrategy({
				clientID: config.FACEBOOK.APP_ID,
				clientSecret: config.FACEBOOK.APP_SECRET,
      }, function(accessToken, refreshToken, profile, done) {
      return done(null, profile);
      }
    ));
		passport.use(new LinkedInTokenStrategy({
        clientID: config.LINKEDIN.APP_ID,
        clientSecret: config.LINKEDIN.APP_SECRET,
      },
      function(accessToken, refreshToken, profile, done) {
        return done(null, profile);
      }
    ));
	}

	/**
	 * Define Application Routes.
	 * @private
	 */
	_defineRoutes () {

		console.log ('Defining application routes.');

		let appExpress = this.app,
			applicationRouteList = require('./routes/index');

		/**
		 * Application Default API Entry
		 */
		appExpress.get('/', (req, res) => {

			let AppConfig = JOLLY.config.APP;

			res.apiSuccess({
				message: `${AppConfig.NAME} v${AppConfig.VERSION}`
			});

		});

		/**
		 * Define application routes.
		 */
		applicationRouteList.forEach((route) => {

			appExpress.use( route.path, route.handler );
		});

        /**
		 * Implement 404 not found and global error handlers.
         */
		this._notFoundHandler();
		this._errorHandler();
	}

    /**
     * Error, not found handler.
     */
    _notFoundHandler () {

        let appExpress = this.app;

        appExpress.use((req, res, next) =>  {

        	let error = new ApiError('Unable to find your api call method.', 404);
        	next (error);
        });
    }

	/**
	 * Global Error Handler
	 */
	_errorHandler () {

		let appExpress = this.app;

		appExpress.use((err, req, res, next) =>  {

			let responseData = res.createResponse (false),
				errorCode = err.code || 500,
				errorMessage = err.message || 'Service internal issue.';

			responseData.error = {
				code: errorCode,
				message: errorMessage
			};

			if (errorCode == 500) {
				responseData.error.stack = err.stack.split('\n')[1].trim();
			}

			res.status(errorCode).json(responseData);
		});
	}

	/**
	 * Start the the server instance.
	 * @param options
	 * @param {String} options.ip - Server binding IP Address.
	 * @param {Number} options.port - Server listening port number.
	 * @returns {App}
	 */
	start (options) {

		options = options || {};

		let appExpress = this.app,
			bindIp = options.ip || new Error('Binding IP address need to be defined.'),
			bindPort = options.port || new Error('Server listening port need to be defined.');

		appExpress.listen(bindPort, bindIp, () => {

			console.log(`Service started, listening on => ${bindIp}:${bindPort}`);
		});

		return this;
	}

}

module.exports = App;
