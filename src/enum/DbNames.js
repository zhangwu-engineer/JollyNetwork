/**
 * Define System Database Names
 */

JOLLY.enum.DbNames = JOLLY.enum.DbNames || {

	DB: process.env.NODE_ENV === 'test' ? 'jolly-test' : 'jollymailertest'

};

module.exports = JOLLY.enum.DbNames;
