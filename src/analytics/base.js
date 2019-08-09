const Analytics = require('analytics-node');
const AWS = require('aws-sdk');


class BaseAnalytics {
  constructor(key, headers) {
    AWS.config.region = 'us-west-2';
    AWS.config.update({ accessKeyId: JOLLY.config.AWS.REPORTING_AWS_ACCESS_KEY_ID, secretAccessKey: JOLLY.config.AWS.REPORTING_AWS_SECRET_ACCESS_KEY });
    this.analytics = new Analytics(key);
    this.headers = headers;
    this.firehose = new AWS.Firehose();
  }

  getContext() {
    if(this.headers) {
      return JSON.parse(JSON.stringify({
        user_agent: this.headers.user_agent,
        ip: this.headers.ip,
        'Google Analytics': {
          clientId: this.headers.clientId,
        },
        page: {
          url: this.headers.page.url,
          path: this.headers.page.path
        }
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

  sendDataToSegment(params) {
    this.analytics.track(params);
  }

  sendDataToKinesis(params) {
    delete params.context;
    params.timestamp = new Date();
    const record = {
      DeliveryStreamName: JOLLY.config.AWS.REPORTING_DELIVERY_STREAM,
      Record: { Data: JSON.stringify(params) },
    };
    this.firehose.putRecord(record, (error, _) => {
      if (error) console.log(error, error.stack);
    });
  }

  track(params) {
    params = this.applyContext(params);
    this.sendDataToSegment(params);
    if(JOLLY.config.APP.NODE_ENV === 'production') {
      this.sendDataToKinesis(params);
    }
  }
}

module.exports = BaseAnalytics;
