const BaseAnalytics = require('./base.js');

class PostAnalytics extends BaseAnalytics  {
  constructor(key, headers) {
    super(key, headers);
  }

  send(user, post) {
    let params = {
      userId: user,
      event: 'Post Created',
      properties: {
        postID: post.id,
        posterID: user,
        postType: post.category,
        city: post.location,
      }
    };
    this.track(params);
  }

  sendVote(user, postId) {
    let params = {
      userId: user,
      event: 'Helpful Clicked',
      properties: {
        postID: postId,
        userID: user,
      }
    };
    this.track(params);
  }
}

module.exports = PostAnalytics;
