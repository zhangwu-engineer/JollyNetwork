const ObjectId = require('mongodb').ObjectID;
/**
 * Profile type
 * @typedef {Object} Profile
 * @property {String} name
 * @property {String} phone
 * @property {Boolean} verifiedPhone
 * @property {String} bio
 * @property {Boolean} receiveEmail
 * @property {Boolean} receiveSMS
 * @property {Boolean} receiveCall
 * @property {String} location
 * @property {String} distance
 * @property {String} facebook
 * @property {String} twitter
 * @property {String} linkedin
 * @property {String} youtube
 * @property {Boolean} showImageLibrary
 * @property {Boolean} showSocialLinks
 * @property {Boolean} public
 * @property {ObjectId} user_id
 * @property {Date|String} date_created
 * @property {Date|String} date_updated
 *
 */

const BaseEntityWithID = require('./base/BaseEntityWithID');

class EntityProfile extends BaseEntityWithID {

    /**
     * User constructor method.
     * @param {User} options
     */
    constructor (options) {

        super (options);

        this._name = options.name || null;
        this._phone = options.phone || null;
        this._verifiedPhone = options.verifiedPhone || false;
        this._bio = options.bio || null;
        this._receiveEmail = options.receiveEmail === undefined ? true : options.receiveEmail;
        this._receiveSMS = options.receiveSMS === undefined ? true : options.receiveSMS;
        this._receiveCall = options.receiveCall === undefined ? true : options.receiveCall;
        this._location = options.location || null;
        this._distance = options.distance || null;
        this._facebook = options.facebook || null;
        this._twitter = options.twitter || null;
        this._linkedin = options.linkedin || null;
        this._youtube = options.youtube || null;
        this._showImageLibrary = options.showImageLibrary === undefined ? true : options.showImageLibrary;
        this._showSocialLinks = options.showSocialLinks === undefined ? true : options.showSocialLinks;
        this._public = options.public === undefined ? true : options._public;
        this._userId = new ObjectId(options.userId);
        this._dateCreated = options.dateCreated ? new Date(options.dateCreated) : new Date();
        this._dateUpdated = options.dateUpdated ? new Date(options.dateUpdated) : this._dateCreated;
    }

    /**
     * @param {Object} [options]
     * @return {Object}
     */
    toJson (options) {

      let data = super.toJson();

      Object.keys(this).forEach(property => {
        if (property !== '_id' && this[property] !== null) {
          const name = property.replace('_', '');
          data[name] = this[property];
        }
      });

      return data;
    }

}
module.exports = EntityProfile;
