const ObjectId = require('mongodb').ObjectID;
/**
 * Talent type
 * @typedef {Object} Talent
 * @property {String} path
 * @property {JOLLY.enum.FileType|String} type
 * @property {ObjectId} user_id
 * @property {Date|String} date_created
 *
 */

const BaseEntityWithID = require('./base/BaseEntityWithID'),
  FileType = require('../enum/FileType');

class EntityFile extends BaseEntityWithID {

    /**
     * File constructor method.
     * @param {File} options
     */
    constructor (options) {

        super (options);

        this._path = options.path;
        this._type = options.type || FileType.IMAGE;
        this._userId = new ObjectId(options.user_id);
        this._dateCreated = options.date_created ? new Date(options.date_created) : new Date();
    }

    /**
     * @param {Object} [options]
     * @return {Object}
     */
    toJson (options) {

      let data = super.toJson();

      data.path = this._path;
      data.type = this._type;
      data.user_id = this._userId;
      data.date_created = this._dateCreated;

      return data;
    }

}
module.exports = EntityFile;
