const cron = require("node-cron");
const marketingEmails = require('../lib/marketingEmails');

const coworkersConnectingMailCron = () => {
  cron.schedule("15 13 9 * *", () => {
    console.log('cron job running');
    const marketing = new marketingEmails();
    marketing.coworkersConnectingMailer();
  });
};

const monthlyDigestMailCron = () => {
  cron.schedule("30 7 1 * *", () => {
    console.log('cron job running');
    const marketing = new marketingEmails();
    marketing.monthlyDigestMailer();
  });
};

module.exports = { coworkersConnectingMailCron, monthlyDigestMailCron };
