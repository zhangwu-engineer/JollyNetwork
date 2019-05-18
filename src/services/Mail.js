/**
 * Mail Service
 */

const mandrill = require('mandrill-api/mandrill'),
  _ = require('lodash'),
  Analytics = require('analytics-node'),
  jwt = require('jsonwebtoken');

class Mail {

	/**
	 * Constructor method.
	 * @param {Object} [options]
	 * @returns {Mail|*}
	 */
	constructor (options) {

		if ( !Mail.instance ) {

			Mail.instance = this;
		}

		return Mail.instance;
  }

  sendEmailVerification(data) {
    const authService = JOLLY.service.Authentication;
    const mandrill_client = new mandrill.Mandrill(JOLLY.config.MANDRILL.API_KEY);
    const token = authService.generateToken({ userId: data.id, expiresIn: 36000 });
    var template_name = "email-verification";
    var template_content = [];
    var message = {
      "to": [{
        "email": data.email,
        "name": `${_.capitalize(data.firstName)} ${_.capitalize(data.lastName)}`,
        "type": "to"
      }],
      "merge_vars": [{
        "rcpt": data.email,
        "vars": [{
          "name": "link",
          "content": `<a href="${JOLLY.config.APP.APP_DOMAIN}/email-verification/${token}">Click here to confirm your email address</a>`
        }]
      }],
    }
    var async = true;
    var ip_pool = "Main Pool";
    var send_at = new Date();

    mandrill_client.messages.sendTemplate({
      "template_name": template_name,
      "template_content": template_content,
      "message": message,
      "async": async,
      "ip_pool": ip_pool,
      "send_at": send_at,
    });
  }

  sendPasswordResetEmail(data) {
    const authService = JOLLY.service.Authentication;
    const mandrill_client = new mandrill.Mandrill(JOLLY.config.MANDRILL.API_KEY);
    const token = authService.generateToken({ userId: data.id, expiresIn: 36000 });
    var template_name = "password-reset";
    var template_content = [];
    var message = {
      "to": [{
        "email": data.email,
        "name": `${_.capitalize(data.firstName)} ${_.capitalize(data.lastName)}`,
        "type": "to"
      }],
      "merge_vars": [{
        "rcpt": data.email,
        "vars": [{
          "name": "link",
          "content": `<a href="${JOLLY.config.APP.APP_DOMAIN}/reset-password/${token}">Click here to reset your password</a>`
        }]
      }],
    }
    var async = false;
    var ip_pool = "Main Pool";
    var send_at = new Date();

    return new Promise((resolve, reject) => {
      mandrill_client.messages.sendTemplate({
        "template_name": template_name,
        "template_content": template_content,
        "message": message,
        "async": async,
        "ip_pool": ip_pool,
        "send_at": send_at,
      }, function(result) {
        resolve(result);
      }, function(e) {
        reject(e);
      });
    });
  }

  sendInvite(tagges, work, tagger) {
    const authSecret = JOLLY.config.APP.AUTHENTICATION_SECRET;
    const mandrill_client = new mandrill.Mandrill(JOLLY.config.MANDRILL.API_KEY);
    var template_name = "invite";
    var template_content = [];
    const tokens = [];
    tagges.forEach(tagee => {
      const token = jwt.sign ({
        workId: work.id,
        tagger: tagger,
        startFrom: tagee.existing ? 'signin' : 'signup',
			}, authSecret, {
				expiresIn: 86400
      });
      tokens.push(token);
      const taggerFirstName = `${_.capitalize(tagger.firstName)}`;
      const taggerLastName = `${_.capitalize(tagger.lastName)}`;
      var message = {
        "subject": `${taggerFirstName} ${taggerLastName} tagged you on a job.`,
        "to": [{
          "email": tagee.email,
          "type": "to"
        }],
        "merge_vars": [{
          "rcpt": tagee.email,
          "vars": [{
            "name": "fname",
            "content": taggerFirstName,
          }, {
            "name": "lname",
            "content": taggerLastName,
          }, {
            "name": "ename",
            "content": work.title,
          }, {
            "name": "eextra",
            "content": "",
          }, {
            "name": "link",
            "content": `<a href="${JOLLY.config.APP.APP_DOMAIN}/f/${tagger.slug}/e/${work.slug}/work/${token}">View My Invitation</a>`
          }]
        }],
      }
      var async = true;
      var ip_pool = "Main Pool";
      var send_at = new Date();

      mandrill_client.messages.sendTemplate({
        "template_name": template_name,
        "template_content": template_content,
        "message": message,
        "async": async,
        "ip_pool": ip_pool,
        "send_at": send_at,
      });
    });
    return tokens;
  }

  sendSignupInvite(email, user) {
    const mandrill_client = new mandrill.Mandrill(JOLLY.config.MANDRILL.API_KEY);
    const analytics = new Analytics(JOLLY.config.SEGMENT.WRITE_KEY);
    var template_name = "signup-invite";
    var template_content = [];
    const firstName = `${_.capitalize(user.firstName)}`;
    const lastName = `${_.capitalize(user.lastName)}`;
    var message = {
      "subject": `${_.capitalize(user.firstName)} ${_.capitalize(user.lastName)} invited you.`,
      "to": [{
        "email": email,
        "type": "to"
      }],
      "merge_vars": [{
        "rcpt": email,
        "vars": [{
          "name": "fname",
          "content": firstName,
        }, {
          "name": "lname",
          "content": lastName,
        }, {
          "name": "link",
          "content": `<a href="${JOLLY.config.APP.APP_DOMAIN}/freelancer-signup">Click here to sign up.</a>`
        }]
      }],
    }
    var async = false;
    var ip_pool = "Main Pool";
    var send_at = new Date();

    return new Promise((resolve, reject) => {
      mandrill_client.messages.sendTemplate({
        "template_name": template_name,
        "template_content": template_content,
        "message": message,
        "async": async,
        "ip_pool": ip_pool,
        "send_at": send_at,
      }, function(result) {
        analytics.track({
          userId: user.id.toString(),
          event: 'User Invited',
          properties: {
            requesterUserId: user.id.toString(),
            invitedUserId: email,
          }
        });
        resolve(result);
      }, function(e) {
        reject(e);
      });
    });
  }

  sendConnectionInvite(email, user) {
    const mandrill_client = new mandrill.Mandrill(JOLLY.config.MANDRILL.API_KEY);
    var template_name = "connection-invite";
    var template_content = [];
    var message = {
      "subject": `${_.capitalize(user.firstName)} ${_.capitalize(user.lastName)} invited you.`,
      "to": [{
        "email": email,
        "type": "to"
      }],
      "merge_vars": [{
        "rcpt": email,
        "vars": [{
          "name": "fname",
          "content": _.capitalize(user.firstName)
        }, {
          "name": "lname",
          "content": _.capitalize(user.lastName)
        }, {
          "name": "link",
          "content": `<a href="${JOLLY.config.APP.APP_DOMAIN}/network">Network</a>`
        }]
      }],
    }
    var async = false;
    var ip_pool = "Main Pool";
    var send_at = new Date();

    return new Promise((resolve, reject) => {
      mandrill_client.messages.sendTemplate({
        "template_name": template_name,
        "template_content": template_content,
        "message": message,
        "async": async,
        "ip_pool": ip_pool,
        "send_at": send_at,
      }, function(result) {
        resolve(result);
      }, function(e) {
        reject(e);
      });
    });
  }

  sendFirstCommentEmail(email, user, comment, post) {
    const mandrill_client = new mandrill.Mandrill(JOLLY.config.MANDRILL.API_KEY);
    var template_name = "first-comment-alert";
    var template_content = [];
    var message = {
      "subject": `${_.capitalize(user.firstName)} ${_.capitalize(user.lastName)} commented on your post!`,
      "to": [{
        "email": email,
        "type": "to"
      }],
      "merge_vars": [{
        "rcpt": email,
        "vars": [{
          "name": "comment",
          "content": comment
        }, {
          "name": "post",
          "content": post.content
        }, {
          "name": "link",
          "content": `<a href="${JOLLY.config.APP.APP_DOMAIN}/feed">Join the conversation</a>`
        }]
      }],
    }
    var async = false;
    var ip_pool = "Main Pool";
    var send_at = new Date();

    return new Promise((resolve, reject) => {
      mandrill_client.messages.sendTemplate({
        "template_name": template_name,
        "template_content": template_content,
        "message": message,
        "async": async,
        "ip_pool": ip_pool,
        "send_at": send_at,
      }, function(result) {
        resolve(result);
      }, function(e) {
        reject(e);
      });
    });
  }
}

module.exports = Mail;
