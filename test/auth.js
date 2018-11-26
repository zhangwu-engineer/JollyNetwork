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

describe('Auth', () => {
  before(() => {
    return new Promise((resolve) => {
      DefaultConfig(() => {
        const application = new App();
        server = application.app;
        if (application.ready) {
          const payload = {
            email: 'akira.matsui@gmail.com',
            firstName: 'Akira',
            lastName: 'Matsui',
            password: 'password',
          };
          JOLLY.controller.UserController
            .registerUser(payload)
            .then((userData) => {
              token = JOLLY.service.Authentication.generateToken({
                userId: userData.id
              });
              resolve();
            });
        } else {
          server.on("appStarted", function() {
            const payload = {
              email: 'akira.matsui@gmail.com',
              firstName: 'Akira',
              lastName: 'Matsui',
              password: 'password',
            };
            JOLLY.controller.UserController
              .registerUser(payload)
              .then((userData) => {
                token = JOLLY.service.Authentication.generateToken({
                  userId: userData.id
                });
                resolve();
              });
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
  describe('Login ---> POST /auth/login', () => {
    it('should fail to login with wrong email', () => {
      const payload = {
        email: 'akira.matsui123@gmail.com',
        password: 'password',
      };
      return chai
        .request(server)
        .post('/auth/login')
        .send(payload)
        .then(res => {
          expect(res).to.have.status(404);
          expect(res.body.error).to.have.property('code', 404);
          expect(res.body.error).to.have.property('message', 'The email or password entered is incorrect');
        })
        .catch(err => {
          throw err;
        });
    });
    it('should fail to login with wrong password', () => {
      const payload = {
        email: 'akira.matsui@gmail.com',
        password: 'password123',
      };
      return chai
        .request(server)
        .post('/auth/login')
        .send(payload)
        .then(res => {
          expect(res).to.have.status(404);
          expect(res.body.error).to.have.property('code', 404);
          expect(res.body.error).to.have.property('message', 'The email or password entered is incorrect');
        })
        .catch(err => {
          throw err;
        });
    });
    it('should return token', () => {
      const payload = {
        email: 'akira.matsui@gmail.com',
        password: 'password',
      };
      return chai
        .request(server)
        .post('/auth/login')
        .send(payload)
        .then(res => {
          expect(res).to.have.status(200);
          expect(res.body.response).to.have.property('auth_token');
        })
        .catch(err => {
          throw err;
        });
    });
  });
});
