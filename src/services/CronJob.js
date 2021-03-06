const cron = require("node-cron");
const marketingEmails = require('../lib/marketingEmails');

const monthlyDigestMailCron = () => {
  cron.schedule("30 7 1 * *", function() {
    console.log('cron job running');
    const marketing = new marketingEmails();
    marketing.monthlyDigestMailer();
  });
};

module.exports = { monthlyDigestMailCron };
