const BaseAnalytics = require('./base.js');

class WorkAnalytics extends BaseAnalytics {
  constructor(key, headers) {
    super(key, headers);
  }

  send(user, work, options) {
    const { firstName, lastName, email, jobAddedMethod, isEventCreator } = options;
    let params = {
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
      }
    };
    this.track(params);
  }

  coworkerTagged(user, work, options) {
    const { coworker, tagStatus, tagger } = options;
    const taggedCoworker = { email: coworker.email };
    if(coworker._id) taggedCoworker.userID = coworker._id.toString();
    if(coworker.id) taggedCoworker.userID = coworker.id.toString();
    if(coworker.firstName) taggedCoworker.name = `${coworker.firstName} ${coworker.lastName}`;
    let params = {
      userId: user,
      event: 'Coworker Tagged on Job',
      properties: {
        userID: tagger || user,
        jobID: work.id,
        eventID: work.slug,
        jobAddedMethod: work.addMethod || 'created',
        taggedCoworker,
        tagStatus: tagStatus || 'awaiting_response',
      }
    };
    this.track(params);
  }

  coworkerTaggedVerified(user, work, options) {
    const { coworker, verificationMethod } = options;
    let params = {
      userId: user,
      event: 'Coworker Job Verified',
      properties: {
        userID: user,
        jobID: work.id,
        eventID: work.slug,
        jobAddedMethod: work.addMethod,
        verificationMethod: verificationMethod || 'clicked',
        verifiedCoworkerUserID: coworker,
      }
    };
    this.track(params);
  }

  coworkerTagAccepted(user, work, options) {
    const { taggingUserID } = options;
    let params = {
      userId: user,
      event: 'Coworker Tag on Job Accepted',
      properties: {
        userID: user,
        jobID: work._id,
        eventID: work.slug,
        taggingUserID: taggingUserID,
      }
    };
    this.track(params);
  }

  coworkerEndorsed(user, work, options) {
    const { quality, coworkerId } = options;
    let params = {
      userId: user,
      event: 'Coworker Job Endorsed',
      properties: {
        userID: user,
        jobID: work.id,
        eventID: work.slug,
        jobAddedMethod: work.addMethod,
        qualitySelected: quality,
        endorsedCoworkerUserID: coworkerId,
      }
    };
    this.track(params);
  }
}

module.exports = WorkAnalytics;
