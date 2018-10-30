const ObjectId = require('mongodb').ObjectID;
/**
 * Talent type
 * @typedef {Object} Talent
 * @property {String} name
 * @property {ObjectId} user_id
 * @property {Date|String} date_created
 * @property {Date|String} date_updated
 *
 */

const BaseEntityWithID = require('./base/BaseEntityWithID');

class EntityUnit extends BaseEntityWithID {

    /**
     * User constructor method.
     * @param {User} options
     */
    constructor (options) {

        super (options);

        this._name = options.name;
        this._userId = new ObjectId(options.user_id);
        this._dateCreated = options.date_created ? new Date(options.date_created) : new Date();
        this._dateUpdated = options.date_updated ? new Date(options.date_updated) : this._dateCreated;
    }

    /**
     * @param {Object} [options]
     * @return {Object}
     */
    toJson (options) {

      let data = super.toJson();

      data.name = this._name;
      data.user_id = this._userId;
      data.date_created = this._dateCreated;
      data.date_updated = this._dateUpdated;

      return data;
    }

}
module.exports = EntityUnit;
