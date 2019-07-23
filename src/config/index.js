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
      },

      TWILIO: {
        ACCOUNT_SID: env.get('TWILIO_ACCOUNT_SID', ''),
        AUTH_TOKEN: env.get('TWILIO_AUTH_TOKEN', ''),
        FROM: env.get('TWILIO_FROM', ''),
      },
      AWS: {
        ACCESS_KEY_ID: env.get('AWS_ACCESS_KEY_ID', ''),
        SECRET_ACCESS_KEY: env.get('AWS_SECRET_ACCESS_KEY', ''),
        REPORTING_AWS_ACCESS_KEY_ID: env.get('REPORTING_AWS_ACCESS_KEY_ID', ''),
        REPORTING_AWS_SECRET_ACCESS_KEY: env.get('REPORTING_AWS_SECRET_ACCESS_KEY', ''),
      },
      S3: {
        BUCKET: env.get('S3_BUCKET', ''),
        BUCKET_LINK: env.get('S3_BUCKET_LINK', ''),
        RESUME_BUCKET: env.get('S3_RESUME_BUCKET', ''),
        RESUME_BUCKET_LINK: env.get('S3_RESUME_BUCKET_LINK', ''),
        REPORTING_S3_BUCKET: env.get('REPORTING_S3_BUCKET', ''),
      },
      SEGMENT: {
        WRITE_KEY: env.get('SEGMENT_WRITE_KEY', ''),
      },
      GEOCODING_KEY: env.get('GEOCODING_KEY', '')
    };

    env.done();
  };

  new EnvLoader({
    onLoad: _callBack,
    onComplete: callbackOnComplete
  });
};
