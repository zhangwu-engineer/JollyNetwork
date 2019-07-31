const BaseAnalytics = require('./base.js');

class UserAnalytics extends BaseAnalytics {
  constructor(key, headers) {
    super(key, headers);
  }

  sendInvite(user, email) {
    let params = {
      userId: user,
      event: 'User Invited',
      properties: {
        requesterUserId: user,
        invitedUserId: email,
      }
    };
    this.track(params);
  }
}

module.exports = UserAnalytics;
