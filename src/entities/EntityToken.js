/**
 * Token type
 * @typedef {Object} Token
 * @property {String} token
 * @property {Date|String} date_created
 *
 */

const BaseEntityWithID = require('./base/BaseEntityWithID');

class EntityToken extends BaseEntityWithID {

    /**
     * User constructor method.
     * @param {User} options
     */
    constructor (options) {

        super (options);

        this._token = options.token;
        this._dateCreated = options.date_created ? new Date(options.date_created) : new Date();
    }

    /**
     * @param {Object} [options]
     * @return {Object}
     */
    toJson (options) {

      let data = super.toJson();

      data.token = this._token;
      data.date_created = this._dateCreated;

      return data;
    }

}
module.exports = EntityToken;
