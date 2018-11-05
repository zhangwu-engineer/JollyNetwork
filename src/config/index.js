/**
 * Application Default Configs
 */

const EnvLoader = require('../lib/EnvLoader'),
	DbNames = require('../enum/DbNames');

/**
 * Define application configs.
 * @param {Function} callbackOnComplete
 */
module.exports = (callbackOnComplete) => {

	/**
	 *
	 * @param {EnvLoader} env
	 * @private
	 */
	let _callBack = (env) => {

			JOLLY.config = {

				APP: {

					VERSION: '1.0.0',

					NAME: 'JOLLY API',

					BIND_IP: process.env.HOST || '0.0.0.0',

					BIND_PORT: process.env.PORT || 3000,

					/** Note: For production make sure to set this in .env configuration */
					AUTHENTICATION_SECRET: process.env.AUTHENTICATION_SECRET || 'jolly-api',
				},

				MONGO_DB: {

					HOST: process.env.MONGO_DB_HOST || 'localhost',

					PORT: process.env.MONGO_DB_PORT || 27017,

					USER: process.env.MONGO_DB_USER || null,

					PASS: process.env.MONGO_DB_PASS || null,

					AUTH_SRC: process.env.MONGO_DB_AUTH_SRC || null,

					DEFAULT_DATABASE: process.env.MONGO_DB_DEFAULT_DATABASE || DbNames.DB,
				},

				FACEBOOK: {
					APP_ID: process.env.FACEBOOK_APP_ID || '',
					APP_SECRET: process.env.FACEBOOK_APP_SECRET || '',
				},

				LINKEDIN: {
					APP_ID: process.env.LINKEDIN_APP_ID || '',
					APP_SECRET: process.env.LINKEDIN_APP_SECRET || '',
				}

			};

			env.done();
		};

	new EnvLoader({
		onLoad: _callBack,
		onComplete: callbackOnComplete
	});
};
