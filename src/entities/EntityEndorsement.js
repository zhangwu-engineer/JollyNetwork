const ObjectId = require('mongodb').ObjectID;
/**
 * Endorsement type
 * @typedef {Object} Endorsement
 * @property {ObjectId} to
 * @property {ObjectId} from
 * @property {ObjectId} work
 * @property {String} quality
 * @property {Date|String} date_created
 *
 */

const BaseEntityWithID = require('./base/BaseEntityWithID'),
  FileType = require('../enum/FileType');

class EntityEndorsement extends BaseEntityWithID {

    /**
     * Endorsement constructor method.
     * @param {File} options
     */
    constructor (options) {

        super (options);

        this._to = new ObjectId(options.to);
        this._from = new ObjectId(options.from);
        this._work = new ObjectId(options.work);
        this._quality = options.quality;
        this._dateCreated = options.date_created ? new Date(options.date_created) : new Date();
    }

    /**
     * @param {Object} [options]
     * @return {Object}
     */
    toJson (options) {

      let data = super.toJson();

      data.to = this._to;
      data.from = this._from;
      data.work = this._work;
      data.quality = this._quality;
      data.date_created = this._dateCreated;

      return data;
    }

}
module.exports = EntityEndorsement;
