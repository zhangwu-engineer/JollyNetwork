const checkEmail = require('../lib/CheckEmail');
const BaseAnalytics = require('./base.js');

class ConnectionAnalytics extends BaseAnalytics  {
  constructor(key, headers) {
    super(key, headers);
  }

  send(connection, data) {
    let params;
    const eventName = connection.isCoworker ? 'Coworker Request' : 'Connection Request';
    if (connection.status === ConnectionStatus.PENDING) {
      params = {
        userId: data.userId,
        event: `${eventName} Sent`,
        properties: {
          requesterUserId: data.userId,
          invitedUserId: data.toUserId ? data.toUserId : connection.to,
          type: connection.connectionType,
        }
      }
    } else if (connection.status === ConnectionStatus.CONNECTED) {
      params = {
        userId: data.userId,
        event: `${eventName} Accepted`,
        properties: {
          requesterUserId: data.userId,
          invitedUserId: data.toUserId ? data.toUserId : connection.to,
          type: connection.connectionType,
        }
      };
    } else if (connection.status === ConnectionStatus.DISCONNECTED) {
      params = {
        userId: data.userId,
        event: `${connection.isCoworker ? 'Coworker' : ''} Connection Disconnected`.trim(),
        properties: {
          requesterUserId: data.userId,
          invitedUserId: data.toUserId ? data.toUserId : connection.to,
          type: connection.connectionType,
        }
      };
    } else if (connection.status === ConnectionStatus.IGNORED) {
      params = {
        userId: data.userId,
        event: `${eventName} Ignored`,
        properties: {
          requesterUserId: data.userId,
          invitedUserId: data.toUserId ? data.toUserId : connection.to,
          type: connection.connectionType,
        }
      }
    }
    this.track(params);
  }
}

module.exports = ConnectionAnalytics;
