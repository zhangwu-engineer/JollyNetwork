const Analytics = require('analytics-node');

class IdentityAnalytics {
  constructor(key) {
    this.analytics = new Analytics(key);
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

    Promise.all([positionsAdded, countJobsAdded, countPostAdded, countCoworkerConnections, countGenericConnections]).then((result) => {
      console.log(result);
    })
  }
}

module.exports = IdentityAnalytics;
