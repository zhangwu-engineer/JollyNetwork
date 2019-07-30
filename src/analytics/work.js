const BaseAnalytics = require('./base.js');

class WorkAnalytics extends BaseAnalytics {
  constructor(key, headers) {
    super(key, headers);
  }

  send(user, work, options) {
    const { firstName, lastName, email, jobAddedMethod, isEventCreator } = options;
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
        jobAddedMethod: jobAddedMethod || 'created',
        isEventCreator: isEventCreator,
      },
      context: this.context()
    });
  }

  coworkerTagged(user, work, options) {
    const { coworker, tagStatus, tagger } = options;
    const params = { email: coworker.email };
    if(coworker._id) params.userID = coworker._id.toString();
    if(coworker.id) params.userID = coworker.id.toString();
    if(coworker.firstName) params.name = `${coworker.firstName} ${coworker.lastName}`;

    this.analytics.track({
      userId: user,
      event: 'Coworker Tagged on Job',
      properties: {
        userID: tagger || user,
        jobID: work.id,
        eventID: work.slug,
        jobAddedMethod: work.addMethod || 'created',
        taggedCoworker: params,
        tagStatus: tagStatus || 'awaiting_response',
      },
      context: this.context()
    });
  }

  coworkerTaggedVerified(user, work, options) {
    const { coworker, verificationMethod } = options;
    this.analytics.track({
      userId: user,
      event: 'Coworker Job Verified',
      properties: {
        userID: user,
        jobID: work.id,
        eventID: work.slug,
        jobAddedMethod: work.addMethod,
        verificationMethod: verificationMethod || 'clicked',
        verifiedCoworkerUserID: coworker,
      },
      context: this.context()
    });
  }

  coworkerTagAccepted(user, work, options) {
    const { taggingUserID } = options;
    this.analytics.track({
      userId: user,
      event: 'Coworker Tag on Job Accepted',
      properties: {
        userID: user,
        jobID: work._id,
        eventID: work.slug,
        taggingUserID: taggingUserID,
      },
      context: this.context()
    });
  }

  coworkerEndorsed(user, work, options) {
    const { quality, coworkerId } = options;
    this.analytics.track({
      userId: user,
      event: 'Coworker Job Endorsed',
      properties: {
        userID: user,
        jobID: work.id,
        eventID: work.slug,
        jobAddedMethod: work.addMethod,
        qualitySelected: quality,
        endorsedCoworkerUserID: coworkerId,
      },
      context: this.context()
    });
  }
}

module.exports = WorkAnalytics;
