const BaseAnalytics = require('./base.js');

class BadgeAnalytics extends BaseAnalytics {
  constructor(key, headers) {
    super(key, headers);
  }

  send(user, badgeName) {
    let params = {
      userId: user,
      event: `${badgeName} Badge Earned`,
    };
    this.track(params);
  }
}

module.exports = BadgeAnalytics;
