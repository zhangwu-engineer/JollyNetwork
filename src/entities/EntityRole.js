const ObjectId = require('mongodb').ObjectID;
/**
 * Role type
 * @typedef {Object} Role
 * @property {String} name
 * @property {Date|String} date_started
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
        this._dateStarted = options.dateStarted ? new Date(options.dateStarted) : null;
        this._minRate = options.minRate || null;
        this._maxRate = options.maxRate || null;
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
      if (this._dateStarted) {
        data.dateStarted = this._dateStarted;
      }
      if (this._minRate) {
        data.minRate = this._minRate;
      }
      if (this._maxRate) {
        data.maxRate = this._maxRate;
      }
      data.unit = this._unit;
      data.user_id = this._userId;
      data.date_created = this._dateCreated;
      data.date_updated = this._dateUpdated;

      return data;
    }

}
module.exports = EntityRole;
