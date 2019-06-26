const cron = require("node-cron");
const marketingEmails = require('../lib/marketingEmails');

const monthlyDigestEmailCron = () => {
  cron.schedule("*/10 * * * *", function() {
    console.log('cron job running');
    const marketing = new marketingEmails();
    marketing.monthlyDigestMailer();
  });
};

module.exports = { monthlyDigestEmailCron };
