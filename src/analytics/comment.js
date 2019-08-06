const BaseAnalytics = require('./base.js');

class CommentAnalytics extends BaseAnalytics {
  constructor(key, headers) {
    super(key, headers);
  }

  send(user, comment) {
    let params = {
      userId: user,
      event: 'Comment Submitted',
      properties: {
        postID: comment.post,
      }
    };
    this.track(params);
  }
}

module.exports = CommentAnalytics;
