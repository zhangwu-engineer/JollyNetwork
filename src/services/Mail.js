/**
 * Mail Service
 */

const mandrill = require('mandrill-api/mandrill');

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
        "name": `${data.firstName} ${data.lastName}`,
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
        "name": `${data.firstName} ${data.lastName}`,
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
}

module.exports = Mail;