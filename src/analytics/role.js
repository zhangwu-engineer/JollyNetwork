const BaseAnalytics = require('./base.js');

class RoleAnalytics extends BaseAnalytics {
  constructor(key, headers) {
    super(key, headers);
  }

  send(user, role, options) {
    const { work, firstName, lastName, email } = options;
    let params = {
      userId: user,
      event: 'Role Added',
      properties: {
        userID: user,
        userFullname: `${firstName} ${lastName}`,
        userEmail: email,
        roleName: role.name,
        roleRateLow: role.minRate,
        roleRateHigh: role.maxRate,
        years: role.years,
        throughJob: true,
        jobID: work.id,
        eventID: work.slug,
      }
    };
    this.track(params);
  }
}

module.exports = RoleAnalytics;
