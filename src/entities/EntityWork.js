const ObjectId = require('mongodb').ObjectID;
/**
 * Work type
 * @typedef {Object} Work
 * @property {String} title
 * @property {String} role
 * @property {Date|String} from
 * @property {Date|String} to
 * @property {String} caption
 * @property {Boolean} pinToProfile
 * @property {Array} coworkers
 * @property {ObjectId} user_id
 * @property {Date|String} date_created
 * @property {Date|String} date_updated
 *
 */

const BaseEntityWithID = require('./base/BaseEntityWithID');

class EntityWork extends BaseEntityWithID {

    /**
     * Work constructor method.
     * @param {Work} options
     */
    constructor (options) {

        super (options);

        this._title = options.title;
        this._role = options.role;
        this._from = options.from ? new Date(options.from) : new Date();
        this._to = options.to ? new Date(options.to) : new Date();
        this._caption = options.caption;
        this._pinToProfile = options.pinToProfile;
        this._coworkers = options.coworkers;
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

      data.title = this._title;
      data.role = this._role;
      data.from = this._from;
      data.to = this._to;
      data.caption = this._caption;
      data.pinToProfile = this._pinToProfile;
      data.coworkers = this._coworkers;
      data.user_id = this._userId;
      data.date_created = this._dateCreated;
      data.date_updated = this._dateUpdated;

      return data;
    }

}
module.exports = EntityWork;
