const BaseAnalytics = require('./base.js');

class BadgeAnalytics extends BaseAnalytics {
  constructor(key, headers) {
    super(key, headers);
  }

  send(user, badge) {
    let params = {
      userId: user,
      event: 'Badge Earned',
      properties: {
        type: badge,
      }
    };
    this.track(params);
  }
}

module.exports = BadgeAnalytics;
