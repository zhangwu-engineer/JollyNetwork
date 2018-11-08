/**
 * User type
 * @typedef {Object} User
 * @property {String} email - unique
 * @property {String} username - unique
 * @property {String} password
 * @property {Boolean} verifiedEmail
 * @property {Date|String} date_created
 * @property {Date|String} date_updated
 *
 * @property {String} [firstName]
 * @property {String} [lastName]
 * @property {String} slug
 * @property {Date} joindate
 * @property {String} resetToken
 */


const BaseEntityWithID = require('./base/BaseEntityWithID'),
    SystemStatus = require('../enum/SystemStatus'),
    SystemUserRoles = require('../enum/SystemUserRoles');

class EntityUser extends BaseEntityWithID {

    /**
     * User constructor method.
     * @param {User} options
     */
    constructor (options) {

        super (options);

        this._password = options.password;
        this._email = options.email;
        this._verifiedEmail = options.verifiedEmail || false;
        this._dateCreated = options.date_created ? new Date(options.date_created) : new Date();
        this._dateUpdated = options.date_updated ? new Date(options.date_updated) : this._dateCreated;
        this._firstName = options.firstName;
        this._lastName = options.lastName;
        this._slug = options.slug;
    }

    /**
     * Get user password.
     * @returns {String}
     */
    getPassword() {

        return this._password;
    }

    /**
     * @param {Object} [options]
     * @param {Boolean} options.isSafeOutput - Ensure nothing critical is being exposed in output data.
     * @return {Object}
     */
    toJson (options) {

	    options = options || {};

        let isSafeOutput = options.isSafeOutput,
            data = super.toJson();

        data.email = this._email;

        if (!isSafeOutput) {
          data.password = this._password;
          data.verifiedEmail = this._verifiedEmail;
        }

        data.date_created = this._dateCreated;
        data.date_updated = this._dateUpdated;
        data.firstName = this._firstName;
        data.lastName = this._lastName;
        data.slug = this._slug;

        return data;
    }

}
module.exports = EntityUser;
