/**
 * Server Handler Class
 */

const express = require('express');
const bodyParser = require('body-parser');
const ApiError = require('./lib/ApiError');

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

		const appExpress = this.app;

		appExpress.use(bodyParser.urlencoded({ extended: true }));
		appExpress.use(bodyParser.json());
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