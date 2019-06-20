const checkEmail = require('../lib/CheckEmail');
const Analytics = require('analytics-node');

class ConnectionAnalytics {
  constructor(key) {
    this.analytics = new Analytics(key);
  }

  send(connection, params) {
    const method = checkEmail(connection.to) ? 'Email' : 'Nearby';
    if (params.ignored !== true) {
      if(connection.status === ConnectionStatus.PENDING) {
        console.log('inside-pending');
        this.analytics.track({
          userId: params.userId,
          event: connection.isCoworker ? 'Coworker Request' : 'Connection Request',
          properties: {
            requesterUserId: connection.from,
            invitedUserId: connection.to,
            method: method,
            status: 'Pending',
            type: connection.connectionType,
          }
        });
      }
      else if(connection.status === ConnectionStatus.CONNECTED) {
        this.analytics.track({
          userId: params.userId,
          event: connection.isCoworker? 'Coworker Request' : 'Connection Request',
          properties: {
            requesterUserId: connection.from,
            invitedUserId: connection.to,
            method: method,
            status: 'Accepted',
            type: connection.connectionType,
          }
        });
      } else if (connection.status == ConnectionStatus.DISCONNECTED) {
        this.analytics.track({
          userId: params.userId,
          event: connection.isCoworker? 'Coworker Request' : 'Connection Request',
          properties: {
            requesterUserId: connection.from,
            invitedUserId: connection.to,
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
          requesterUserId: connection.from,
          invitedUserId: connection.to,
          method: method,
          status: 'Ignored',
          type: connection.connectionType,
        }
      });
    }
  }
}

module.exports = ConnectionAnalytics;
