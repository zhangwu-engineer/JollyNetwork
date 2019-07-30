const BaseAnalytics = require('./base.js');

class UserAnalytics extends BaseAnalytics {
  constructor(key, headers) {
    super(key, headers);
  }

  sendInvite(user, email) {
    this.analytics.track({
      userId: user,
      event: 'User Invited',
      properties: {
        requesterUserId: user,
        invitedUserId: email,
      },
      context: this.context()
    });
  }
}

module.exports = UserAnalytics;
