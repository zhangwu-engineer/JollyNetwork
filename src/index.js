/**
 * Application Entry
 */
const marketingEmails = require('./lib/marketingEmails');
const cron = require("node-cron");
require('./namespaces');

const DefaultConfig = require('./config'),
	App = require('./App');

/** Load Config and initiate application */
DefaultConfig(() => {

	/**
	 * Initiate application server
	 */
	JOLLY.context = new App();

});

cron.schedule("*/10 * * * *", function() {
	console.log('cron job running');
	const marketing = new marketingEmails();
	marketing.monthlyDigestMailer();
});
