const ObjectId = require('mongodb').ObjectID;
/**
 * Post type
 * @typedef {Object} Post
 * @property {String} category
 * @property {String} content
 * @property {String} location
 * @property {ObjectId} user
 * @property {Array} votes
 * @property {Date|String} date_created
 *
 */

const BaseEntityWithID = require('./base/BaseEntityWithID');

class EntityPost extends BaseEntityWithID {

    /**
     * Post constructor method.
     * @param {Post} options
     */
    constructor (options) {

        super (options);

        this._category = options.category;
        this._content = options.content;
        this._location = options.location;
        this._user = new ObjectId(options.user);
        this._votes = options.votes || [options.user];
        this._comments = options.comments || [];
        this._dateCreated = options.date_created ? new Date(options.date_created) : new Date();
    }

    /**
     * @param {Object} [options]
     * @return {Object}
     */
    toJson (options) {

      let data = super.toJson();

      data.category = this._category;
      data.content = this._content;
      data.location = this._location;
      data.user = this._user;
      data.votes = this._votes;
      data.comments = this._comments;
      data.date_created = this._dateCreated;

      return data;
    }

}
module.exports = EntityPost;
