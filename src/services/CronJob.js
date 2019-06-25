const cron = require("node-cron");
const marketingEmails = require('../lib/marketingEmails');

const monthlyDigestMail = () => {
  cron.schedule("*/1 * * * *", function() {
    console.log('cron job running');
    const marketing = new marketingEmails();
    marketing.monthlyDigestMailer();
  });
};

module.exports = { monthlyDigestMail };
