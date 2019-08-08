const chai = require('chai');
const Promise = require('bluebird');
require('../../src/namespaces');
const DefaultConfig = require('../../src/config');
const	intercomRole = require('../../src/enum/IntercomRole');
const	Role = require('../../src/enum/Role');

const expect = chai.expect;

describe('intercomRole', () => {
  describe('valid case', () => {
    it('returns stringified Intercom role', () => {
      expect(intercomRole([Role[0]])).to.equal('D1')
    });
    it('returns stringified Intercom role stripped to 255 character', () => {
      expect(intercomRole(Role).length).to.equal(255)
    });
    it('returns empty string for empty array', () => {
      expect(intercomRole([])).to.equal('')
    });
  });
  describe('invalid case', () => {
    it('returns empty string', () => {
      expect(intercomRole('Role')).to.equal('')
    });
  });
});
