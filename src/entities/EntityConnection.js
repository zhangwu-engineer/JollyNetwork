const ObjectId = require('mongodb').ObjectID;
/**
 * Connection type
 * @typedef {Object} Connection
 * @property {ObjectId} to
 * @property {ObjectId} from
 * @property {String} status
 * @property {Date|String} connected_at
 * @property {Date|String} date_created
 *
 */

const BaseEntityWithID = require('./base/BaseEntityWithID'),
  ConnectionStatus = require('../enum/ConnectionStatus');

class EntityConnection extends BaseEntityWithID {

    /**
     * Connection constructor method.
     * @param {File} options
     */
    constructor (options) {

        super (options);

        this._to = options.to;
        this._from = options.from;
        this._connectionType = options.connectionType;
        this._status = options.status || ConnectionStatus.PENDING;
        this._connected_at = options.connected_at ? new Date(options.connected_at) : null;
        this._dateCreated = options.date_created ? new Date(options.date_created) : new Date();
        this._connectionType = options.connectionType;
        this._isCoworker = options.isCoworker;
    }

    /**
     * @param {Object} [options]
     * @return {Object}
     */
    toJson (options) {

      let data = super.toJson();

      data.to = this._to;
      data.from = this._from;
      data.status = this._status;
      if (this._connected_at) {
        data.connected_at = this._connected_at;
      }
      data.date_created = this._dateCreated;
      data.connectionType = this._connectionType;
      data.isCoworker = this._isCoworker;

      return data;
    }

}
module.exports = EntityConnection;
