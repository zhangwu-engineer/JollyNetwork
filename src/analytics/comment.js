const BaseAnalytics = require('./base.js');

class CommentAnalytics extends BaseAnalytics {
  constructor(key, headers) {
    super(key, headers);
  }

  send(user, comment) {
    this.analytics.track({
      userId: user,
      event: 'Comment Submitted',
      properties: {
        postID: comment.post,
      },
      context: this.context()
    });
  }
}

module.exports = CommentAnalytics;
