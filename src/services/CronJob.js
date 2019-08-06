const cron = require("node-cron");
const marketingEmails = require('../lib/marketingEmails');

const coworkersConnectingMailCron = () => {
  cron.schedule("51 13 23 * *", function() {
    console.log('cron job running');
    const marketing = new marketingEmails();
    marketing.coworkersConnectingMailer();
  });
};

const monthlyDigestMailCron = () => {
  cron.schedule("30 7 1 * *", function() {
    console.log('cron job running');
    const marketing = new marketingEmails();
    marketing.monthlyDigestMailer();
  });
};

module.exports = { coworkersConnectingMailCron, monthlyDigestMailCron };
