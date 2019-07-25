const BaseAnalytics = require('./base.js');

class PostAnalytics extends BaseAnalytics  {
  constructor(key, headers) {
    super(key, headers);
  }

  send(user, post) {
    this.analytics.track({
      userId: user,
      event: 'Post Created',
      properties: {
        postID: post.id,
        posterID: user,
        postType: post.category,
        city: post.location,
      },
      context: this.context()
    });
  }

  sendVote(user, postId) {
    this.analytics.track({
      userId: user,
      event: 'Helpful Clicked',
      properties: {
        postID: postId,
        userID: user,
      },
      context: this.context()
    });
  }
}

module.exports = PostAnalytics;
