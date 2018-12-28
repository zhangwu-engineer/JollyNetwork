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
let roleId = '';

describe('Role', () => {
  before(() => {
    return new Promise((resolve) => {
      DefaultConfig(() => {
        const application = new App();
        server = application.app;
        if (application.ready) {
          const payload = {
            email: 'akira123@gmail.com',
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
              email: 'akira123@gmail.com',
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
    ['users', 'profiles', 'roles'],
    collectionName => JOLLY.service.Db.database(JOLLY.enum.DbNames.DB).collection(collectionName).deleteMany({}),
    { concurrency: 1 }
  ));
  describe('Create user role ---> POST /role', () => {
    it('should return newly created role data', () => {
      const payload = {
        name: 'Web Development',
        rate: '50.56',
        unit: 'hour',
      };
      return chai
        .request(server)
        .post('/role')
        .set('x-access-token', token)
        .send(payload)
        .then(res => {
          expect(res).to.have.status(200);
          expect(res.body.response).to.have.property('role');
          expect(res.body.response.role).to.have.property('name', 'Web Development');
          roleId = res.body.response.role.id;
        })
        .catch(err => {
          throw err;
        });
    });
  });
  describe('Get user role ---> GET /role', () => {
    it('should return user\'s role data', () => {
      return chai
        .request(server)
        .get('/role')
        .set('x-access-token', token)
        .send()
        .then(res => {
          expect(res).to.have.status(200);
          expect(res.body.response.roles.length).to.be.equal(1);
        })
        .catch(err => {
          throw err;
        });
    });
  });
  describe('Get member role ---> GET /role/user/:slug', () => {
    it('should return user\'s role data', () => {
      return chai
        .request(server)
        .get(`/role/user/akira-matsui`)
        .send()
        .then(res => {
          expect(res).to.have.status(200);
          expect(res.body.response.roles.length).to.be.equal(1);
        })
        .catch(err => {
          throw err;
        });
    });
  });
  describe('Update role ---> PUT /role/:id', () => {
    it('should return updated role data', () => {
      const payload = {
        name: 'Web Development',
        rate: '60',
        unit: 'hour',
      };
      return chai
        .request(server)
        .put(`/role/${roleId}`)
        .set('x-access-token', token)
        .send(payload)
        .then(res => {
          expect(res).to.have.status(200);
          expect(res.body.response).to.have.property('role');
          expect(res.body.response.role).to.have.property('rate', '60');
        })
        .catch(err => {
          throw err;
        });
    });
  });
  describe('Delete role ---> DELETE /role/:id', () => {
    it('should delete role', () => {
      return chai
        .request(server)
        .delete(`/role/${roleId}`)
        .set('x-access-token', token)
        .send()
        .then(res => {
          expect(res).to.have.status(200);
        })
        .catch(err => {
          throw err;
        });
    });
  });
});
