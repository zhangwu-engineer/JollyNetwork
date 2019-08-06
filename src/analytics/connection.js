const checkEmail = require('../lib/CheckEmail');
const BaseAnalytics = require('./base.js');

class ConnectionAnalytics extends BaseAnalytics  {
  constructor(key, headers) {
    super(key, headers);
  }

  send(connection, data) {
    const method = checkEmail(connection.to) ? 'Email' : 'Nearby';
    let params;
    if (connection.status === ConnectionStatus.PENDING) {
      params = {
        userId: data.userId,
        event: connection.isCoworker ? 'Coworker Request' : 'Connection Request',
        properties: {
          requesterUserId: data.userId,
          invitedUserId: data.toUserId ? data.toUserId : connection.to,
          method: method,
          status: 'Pending',
          type: connection.connectionType,
        }
      }
    } else if (connection.status === ConnectionStatus.CONNECTED) {
      params = {
        userId: data.userId,
        event: connection.isCoworker ? 'Coworker Request' : 'Connection Request',
        properties: {
          requesterUserId: data.userId,
          invitedUserId: data.toUserId ? data.toUserId : connection.to,
          method: method,
          status: 'Accepted',
          type: connection.connectionType,
        }
      };
    } else if (connection.status === ConnectionStatus.DISCONNECTED) {
      params = {
        userId: data.userId,
        event: connection.isCoworker ? 'Coworker Request' : 'Connection Request',
        properties: {
          requesterUserId: data.userId,
          invitedUserId: data.toUserId ? data.toUserId : connection.to,
          method: method,
          status: 'Disconnected',
          type: connection.connectionType,
        }
      };
    } else if (connection.status === ConnectionStatus.IGNORED) {
      params = {
        userId: data.userId,
        event: connection.isCoworker ? 'Coworker Request' : 'Connection Request',
        properties: {
          requesterUserId: data.userId,
          invitedUserId: data.toUserId ? data.toUserId : connection.to,
          method: method,
          status: 'Ignored',
          type: connection.connectionType,
        }
      }
    }
    this.track(params);
  }
}

module.exports = ConnectionAnalytics;
