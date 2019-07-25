const checkEmail = require('../lib/CheckEmail');
const BaseAnalytics = require('./base.js');

class ConnectionAnalytics extends BaseAnalytics  {
  constructor(key) {
    super(key);
  }

  send(connection, params) {
    const method = checkEmail(connection.to) ? 'Email' : 'Nearby';
    if (params.ignored !== true) {
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
      }
    } else {
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
