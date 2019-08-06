const BaseAnalytics = require('./base.js');

class IdentityAnalytics extends BaseAnalytics  {
  constructor(key, headers) {
    super(key, headers);
  }

  async send(userId) {
    const userController = JOLLY.controller.UserController;
    const roleController = JOLLY.controller.RoleController;
    const workController = JOLLY.controller.WorkController;
    const postController = JOLLY.controller.PostController;
    const connectionController = JOLLY.controller.ConnectionController;
    const user = await userController.getUserById(userId);
    const positionsAdded = roleController.getUserRoles(user.id).map((m) => m.name);
    const countJobsAdded = workController.getUserWorksCount(user.id);
    const countPostAdded = postController.getUserPostCount(user.id);
    const countCoworkerConnections = connectionController.getUserConnectionsCount(user.id, {isCoworker: true, connectionType: ['f2f']});
    const countGenericConnections = connectionController.getUserConnectionsCount(user.id, {isCoworker: false, connectionType: ['f2f']});
    const countPostHelpful = postController.getUserPostHelpfulCount(user.id);
    const countTaggedCoworker = workController.getUserTaggedCoworkerCount(user.id);

    Promise.all([positionsAdded, countJobsAdded, countPostAdded, countCoworkerConnections, countGenericConnections, countPostHelpful, countTaggedCoworker]).then((result) => {
      let params = {
        returning_user: user.loginCount,
        email: user.email,
        all_positions: result[0],
        count_positions_added: result[0].length,
        count_jobs_added: result[1],
        count_feed_posts: result[2],
        count_f2f_coworker_connections: result[3],
        count_f2f_generic_connections: result[4],
        count_posts_marked_heplful: result[5],
        count_coworkers_tagged_on_jobs: result[6]
      };
      if (user.email.includes('@jollyhq.com')) params.test = true;
      this.analytics.identify({
        userId: userId.toString(),
        traits: params,
        context: this.getContext()
      });
    })
  }
}

module.exports = IdentityAnalytics;
