const ObjectId = require('mongodb').ObjectID;
/**
 * Comment type
 * @typedef {Object} Comment
 * @property {String} content
 * @property {ObjectId} post
 * @property {ObjectId} user
 * @property {Date|String} date_created
 *
 */

const BaseEntityWithID = require('./base/BaseEntityWithID');

class EntityComment extends BaseEntityWithID {

    /**
     * Comment constructor method.
     * @param {Comment} options
     */
    constructor (options) {

        super (options);

        this._content = options.content;
        this._post = new ObjectId(options.post);
        this._user = new ObjectId(options.user);
        this._dateCreated = options.date_created ? new Date(options.date_created) : new Date();
    }

    /**
     * @param {Object} [options]
     * @return {Object}
     */
    toJson (options) {

      let data = super.toJson();

      data.content = this._content;
      data.post = this._post;
      data.user = this._user;
      data.date_created = this._dateCreated;

      return data;
    }

}
module.exports = EntityComment;
