const BaseAnalytics = require('./base.js');

class WorkAnalytics extends BaseAnalytics {
  constructor(key, headers) {
    super(key, headers);
  }

  send(user, work, options) {
    let { firstName, lastName, email } = options;
    this.analytics.track({
      userId: user,
      event: 'Job Added',
      properties: {
        userID: user,
        userFullname: `${firstName} ${lastName}`,
        userEmail: email,
        jobID: work.id,
        eventID: work.slug,
        role: work.role,
        beginDate: work.from,
        endDate: work.to,
        jobCreatedTimestamp: work.date_created,
        caption: work.caption,
        numberOfImages: work.photos.length,
        jobAddedMethod: 'created',
        isEventCreator: true,
      }
    });
  }

  coworkerTagged(user, work, options) {
    let { coworker } = options;
    this.analytics.track({
      userId: user,
      event: 'Coworker Tagged on Job',
      properties: {
        userID: user,
        jobID: work.id,
        eventID: work.slug,
        jobAddedMethod: 'created',
        taggedCoworker: {
          userID: coworker.id,
          email: coworker.email,
          name: `${coworker.firstName} ${coworker.lastName}`
        },
        tagStatus: 'awaiting_response',
      }
    });
  }
}

module.exports = WorkAnalytics;
