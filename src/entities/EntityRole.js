const ObjectId = require('mongodb').ObjectID;
/**
 * Role type
 * @typedef {Object} Role
 * @property {String} name
 * @property {String} month
 * @property {String} year
 * @property {String} minRate
 * @property {String} maxRate
 * @property {String} unit
 * @property {ObjectId} user_id
 * @property {Date|String} date_created
 * @property {Date|String} date_updated
 *
 */

const BaseEntityWithID = require('./base/BaseEntityWithID');

class EntityRole extends BaseEntityWithID {

    /**
     * User constructor method.
     * @param {User} options
     */
    constructor (options) {

        super (options);

        this._name = options.name;
        this._month = options.month;
        this._year = options.year;
        this._minRate = options.minRate;
        this._maxRate = options.maxRate;
        this._unit = options.unit;
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
      data.month = this._month;
      data.year = this._year;
      data.minRate = this._minRate;
      data.maxRate = this._maxRate
      data.unit = this._unit;
      data.user_id = this._userId;
      data.date_created = this._dateCreated;
      data.date_updated = this._dateUpdated;

      return data;
    }

}
module.exports = EntityRole;
