/**
 * SMS Service
 */
const twilio = require('twilio');

class SMS {

	/**
	 * Constructor method.
	 * @param {Object} [options]
	 * @returns {SMS|*}
	 */
	constructor (options) {

		if ( !SMS.instance ) {

			SMS.instance = this;
		}

		return SMS.instance;
  }

  sendSMS(to, msg) {
    const client = twilio(JOLLY.config.TWILIO.ACCOUNT_SID, JOLLY.config.TWILIO.AUTH_TOKEN);
    return client.messages
      .create({
        body: msg,
        from: JOLLY.config.TWILIO.FROM,
        to,
      });
  }

}

module.exports = SMS;
