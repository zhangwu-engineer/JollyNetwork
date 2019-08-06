const checkEmail = require('../lib/CheckEmail');
const Analytics = require('analytics-node');

class ConnectionAnalytics {
  constructor(key) {
    this.analytics = new Analytics(key);
  }

  send(connection, params) {
    const method = checkEmail(connection.to) ? 'Email' : 'Nearby';

    if (connection.status === ConnectionStatus.PENDING) {
      this.analytics.track({
        userId: params.userId,
        event: connection.isCoworker ? 'Coworker Request' : 'Connection Request',
        properties: {
          requesterUserId: params.userId,
          invitedUserId: params.toUserId ? params.toUserId : connection.to,
          method: method,
          status: 'Pending',
          type: connection.connectionType,
        }
      });
    } else if (connection.status === ConnectionStatus.CONNECTED) {
      this.analytics.track({
        userId: params.userId,
        event: connection.isCoworker ? 'Coworker Request' : 'Connection Request',
        properties: {
          requesterUserId: params.userId,
          invitedUserId: params.toUserId ? params.toUserId : connection.to,
          method: method,
          status: 'Accepted',
          type: connection.connectionType,
        }
      });
    } else if (connection.status == ConnectionStatus.DISCONNECTED) {
      this.analytics.track({
        userId: params.userId,
        event: connection.isCoworker ? 'Coworker Request' : 'Connection Request',
        properties: {
          requesterUserId: params.userId,
          invitedUserId: params.toUserId ? params.toUserId : connection.to,
          method: method,
          status: 'Disconnected',
          type: connection.connectionType,
        }
      });
    } else if (connection.status == ConnectionStatus.IGNORED) {
      this.analytics.track({
        userId: params.userId,
        event: connection.isCoworker ? 'Coworker Request' : 'Connection Request',
        properties: {
          requesterUserId: params.userId,
          invitedUserId: params.toUserId ? params.toUserId : connection.to,
          method: method,
          status: 'Ignored',
          type: connection.connectionType,
        }
      });
    }
  }
}

module.exports = ConnectionAnalytics;
