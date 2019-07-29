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
      },
      context: this.context()
    });
  }

  coworkerTagged(user, work, options) {
    let { coworker } = options;

    let params = { email: coworker.email };
    if(coworker.id) params.userID = coworker.id;
    if(coworker.firstName) params.name = `${coworker.firstName} ${coworker.lastName}`;

    this.analytics.track({
      userId: user,
      event: 'Coworker Tagged on Job',
      properties: {
        userID: user,
        jobID: work.id,
        eventID: work.slug,
        jobAddedMethod: work.addMethod || 'created',
        taggedCoworker: params,
        tagStatus: 'awaiting_response',
      },
      context: this.context()
    });
  }

  coworkerTaggedVerified(user, work, options) {
    let { coworker } = options;
    this.analytics.track({
      userId: user,
      event: 'Coworker Job Verified',
      properties: {
        userID: user,
        jobID: work.id,
        eventID: work.slug,
        jobAddedMethod: work.addMethod,
        verificationMethod: 'clicked',
        verifiedCoworkerUserID: coworker,
      }
    });
  }
}

module.exports = WorkAnalytics;
