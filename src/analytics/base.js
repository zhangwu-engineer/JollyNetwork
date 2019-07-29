const Analytics = require('analytics-node');

class BaseAnalytics {
  constructor(key, headers) {
    this.analytics = new Analytics(key);
    this.headers = headers;
  }

  context() {
    if(this.headers) {
      return JSON.parse(JSON.stringify({
        user_agent: this.headers.user_agent,
        ip: this.headers.ip,
        'Google Analytics': {
          clientId: this.headers.clientId,
        },
      }));
    } else {
      return {}
    }
  }

}

module.exports = BaseAnalytics;
