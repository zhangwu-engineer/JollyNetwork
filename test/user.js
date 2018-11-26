const chai = require('chai');
const chaiHttp = require('chai-http');
const Promise = require('bluebird');
require('../src/namespaces');
const DefaultConfig = require('../src/config');
const	App = require('../src/App');

chai.use(chaiHttp);
const expect = chai.expect;

let server = null;
let token = null;

describe('User', () => {
  before(() => {
    return new Promise((resolve) => {
      DefaultConfig(() => {
        const application = new App();
        server = application.app;
        if (application.ready) {
          resolve();
        } else {
          server.on("appStarted", function() {
            resolve();
          });
        }
      });
    });
  });

  after(() => Promise.map(
    ['users', 'profiles'],
    collectionName => JOLLY.service.Db.database(JOLLY.enum.DbNames.DB).collection(collectionName).deleteMany({}),
    { concurrency: 1 }
  ));
  describe('Create new user ---> /user/register', () => {
    it('should return auth token of new user', () => {
      const payload = {
        email: 'akira123@gmail.com',
        firstName: 'Akira',
        lastName: 'Matsui',
        password: 'password',
      };
      return chai
        .request(server)
        .post('/user/register')
        .send(payload)
        .then(res => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success', true);
          expect(res.body.response).to.have.property('auth_token');
          token = res.body.response.auth_token;
        })
        .catch(err => {
          throw err;
        });
    });
  });
  describe('Create user with duplicate data ---> /user/register', () => {
    it('should not allow duplicate email', () => {
      const payload = {
        email: 'akira123@gmail.com',
        firstName: 'Akira',
        lastName: 'Matsui',
        password: 'password',
      };
      return chai
        .request(server)
        .post('/user/register')
        .send(payload)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('success', false);
          expect(res.body.error).to.have.property('message', 'email exists');
        })
        .catch(err => {
          throw err;
        });
    });
  });

  describe('Get User ---> /user/me', () => {
    it('should return user object', () =>
      chai
        .request(server)
        .get('/user/me')
        .set('x-access-token', token)
        .then(res => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('response');
          expect(res.body.response).to.have.property('profile');
        })
        .catch(err => {
          throw err;
        }));
  });
});
