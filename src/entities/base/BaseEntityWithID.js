const BaseEntity = require('./BaseEntity');


class BaseEntityWithID extends BaseEntity {

    /**
     * Constructor method.
     * @param {Object} options
     * @param {String|Number} [options.id] - Object ID
     * @param {String|Number} [options._id] - Object ID
     */
    constructor (options) {

        super();

        //this._id = (options.id || options._id) || new Error ('Object ID must be defined.');
        this._id = (options.id || options._id) || null;
    }

    getId () {

        return this._id;
    }

    /**
     * convert the object to json.
     * @param {Object} [options]
     * @returns {Object}
     * @public
     */
    toJson (options) {

        return {
            id: this._id
        }
    }

}

module.exports = BaseEntityWithID;