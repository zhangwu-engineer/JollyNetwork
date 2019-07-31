const Analytics = require('analytics-node');

class BaseAnalytics {
  constructor(key, headers) {
    this.analytics = new Analytics(key);
    this.headers = headers;
  }

  getContext() {
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

  applyContext(params) {
    if(this.headers && this.headers.clientId) params.properties.ga_client_id = this.headers.clientId;
    params.context = this.getContext();
    return params;
  }

  track(params) {
    params = this.applyContext(params);
    this.analytics.track(params);
  }
}

module.exports = BaseAnalytics;
