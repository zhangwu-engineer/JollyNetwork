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
 * @property {Array} verifiedCoworkers
 * @property {Array} verifiers
 * @property {Array} photos
 * @property {String} slug
 * @property {String} addMethod
 * @property {ObjectId} user
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
        this._coworkers = options.coworkers || [];
        this._verifiedCoworkers = options.verifiedCoworkers || [];
        this._verifiers = options.verifiers || [];
        this._photos = options.photos || [];
        this._slug = options.slug;
        this._addMethod = options.addMethod || 'created';
        this._user = new ObjectId(options.user);
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
      data.verifiedCoworkers = this._verifiedCoworkers;
      data.verifiers = this._verifiers;
      data.photos = this._photos;
      data.slug = this._slug;
      data.addMethod = this._addMethod;
      data.user = this._user;
      data.date_created = this._dateCreated;
      data.date_updated = this._dateUpdated;

      return data;
    }

}
module.exports = EntityWork;
