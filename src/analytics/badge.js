const BaseAnalytics = require('./base.js');

class BadgeAnalytics extends BaseAnalytics {
  constructor(key, headers) {
    super(key, headers);
  }

  send(user, badge) {
    this.analytics.track({
      userId: user,
      event: 'Badge Earned',
      properties: {
        type: badge,
      },
      context: this.context()
    });
  }
}

module.exports = BadgeAnalytics;
