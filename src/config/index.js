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

					BIND_IP: env.get('HOST', '0.0.0.0'),

					BIND_PORT: env.get('PORT', 3001),

					/** Note: For production make sure to set this in .env configuration */
          AUTHENTICATION_SECRET: env.get('AUTHENTICATION_SECRET', 'jolly-api'),

          APP_DOMAIN: env.get('APP_DOMAIN', ''),
				},

				MONGO_DB: {

					HOST: env.get('MONGO_DB_HOST', 'localhost'),

					PORT: env.get('MONGO_DB_PORT', 27017),

					USER: env.get('MONGO_DB_USER', null),

					PASS: env.get('MONGO_DB_PASS', null),

					AUTH_SRC: env.get('MONGO_DB_AUTH_SRC', null),

					DEFAULT_DATABASE: env.get('MONGO_DB_DEFAULT_DATABASE', DbNames.DB),
				},

				FACEBOOK: {
					APP_ID: env.get('FACEBOOK_APP_ID', ''),
					APP_SECRET: env.get('FACEBOOK_APP_SECRET', ''),
				},

				LINKEDIN: {
					APP_ID: env.get('LINKEDIN_APP_ID', ''),
					APP_SECRET: env.get('LINKEDIN_APP_SECRET', ''),
				},

        MANDRILL: {
          API_KEY: env.get('MANDRILL_APP_KEY', ''),
        }
			};

			env.done();
		};

	new EnvLoader({
		onLoad: _callBack,
		onComplete: callbackOnComplete
	});
};
