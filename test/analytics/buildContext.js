const chai = require('chai');
require('../../src/namespaces');
const buildContext = require('../../src/analytics/helper/buildContext');

const expect = chai.expect;

describe('buildContext', () => {
  let req = {
    ip: '1.1.1.1',
    headers: {
      'user-agent': 'Chrome',
      'client-id': 12345,
      'url-referer': 'https://jollyhq.com/network/connections',
    }
  };
  describe('valid', () => {
    it('returns object', () => {
      let context = buildContext(req);
      expect(context).to.be.an('object');
      expect(context).to.have.property('user_agent');
      expect(context).to.have.property('clientId');
      expect(context).to.have.property('ip');
      expect(context).to.have.property('page');
      expect(context.user_agent).to.equal(req.headers["user-agent"]);
      expect(context.clientId).to.equal(req.headers["client-id"]);
      expect(context.ip).to.equal(req.ip);
      expect(context.page).to.have.property('url');
      expect(context.page).to.have.property('path');
      expect(context.page.url).to.equal(req.headers["url-referer"])
      expect(context.page.path).to.equal('/network/connections');
    });
  });
  describe('no headers', () => {
    it('returns object', () => {
      let context = buildContext({});
      expect(context).to.be.an('object');
      expect(context).to.not.have.property('user_agent');
      expect(context).to.not.have.property('clientId');
      expect(context).to.not.have.property('ip');
      expect(context).to.not.have.property('page');
    });
  });
});
