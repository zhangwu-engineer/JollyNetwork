const cron = require("node-cron");
const marketingEmails = require('../lib/marketingEmails');

const coworkersConnectingMailCron = () => {
  cron.schedule("55 13 23 * *", function() {
    console.log('cron job running');
    const marketing = new marketingEmails();
    marketing.coworkersConnectingMailer();
  });
};

module.exports = { coworkersConnectingMailCron };
