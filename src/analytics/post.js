const BaseAnalytics = require('./base.js');

class PostAnalytics extends BaseAnalytics  {
  constructor(key, headers) {
    super(key, headers);
  }

  getEventName(category) {
    category = category.split('-');
    category = category.map(c => c[0].toUpperCase() + c.substring(1, c.length));
    return category.join(' ')
  }

  send(user, post) {
    let params = {
      userId: user,
      event: `${this.getEventName(post.category)} Post Created`,
      properties: {
        postID: post.id,
        posterID: user,
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
