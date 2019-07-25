const Analytics = require('analytics-node');

class BaseAnalytics {
  constructor(key, headers) {
    this.analytics = new Analytics(key);
    this.headers = headers;
  }

  context() {
    return JSON.parse(JSON.stringify({
      user_agent: this.headers['user-agent'],
      'Google Analytics': {
        clientId: this.headers.clientID,
      },
    }));
  }

}

module.exports = BaseAnalytics;
