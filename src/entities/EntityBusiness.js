const ObjectId = require('mongodb').ObjectID;
/**
 * Business type
 * @typedef {Object} Business
 * @property {String} name
 * @property {String} category
 * @property {ObjectId} user
 * @property {String} location
 * @property {Date|String} date_created
 * @property {Date|String} date_updated
 * @property {String} slug
 * @property {String} aboutUs
 * @property {String} website
 * @property {String} freelancerPaymentTerms
 * @property {Array} otherLocations
 */

const BaseEntityWithID = require('./base/BaseEntityWithID');

class EntityBusiness extends BaseEntityWithID {

    /**
     * Business constructor method.
     * @param {Business} options
     */
    constructor (options) {

        super (options);

        this._name = options.name || null;
        this._category = options.category || null;
        this._slug = options.slug || null;
        this._user = new ObjectId(options.user);
        this._location = options.location || null;
        this._aboutUs = options.aboutUs || null;
        this._website = options.website || null;
        this._freelancerPaymentTerms = options.freelancerPaymentTerms || null;
        this._otherLocations = options.otherLocations || null;
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
module.exports = EntityBusiness;
