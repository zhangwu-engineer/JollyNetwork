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
let unitId = '';

describe('Unit', () => {
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
    ['users', 'profiles', 'units'],
    collectionName => JOLLY.service.Db.database(JOLLY.enum.DbNames.DB).collection(collectionName).deleteMany({}),
    { concurrency: 1 }
  ));
  describe('Create user unit ---> POST /unit', () => {
    it('should return newly created unit data', () => {
      const payload = {
        name: 'Week',
      };
      return chai
        .request(server)
        .post('/unit')
        .set('x-access-token', token)
        .send(payload)
        .then(res => {
          expect(res).to.have.status(200);
          expect(res.body.response).to.have.property('unit');
          expect(res.body.response.unit).to.have.property('name', 'Week');
          unitId = res.body.response.unit.id;
        })
        .catch(err => {
          throw err;
        });
    });
  });
  describe('Get user unit ---> GET /unit', () => {
    it('should return user\'s unit data', () => {
      return chai
        .request(server)
        .get('/unit')
        .set('x-access-token', token)
        .send()
        .then(res => {
          expect(res).to.have.status(200);
          expect(res.body.response.unit_list.length).to.be.equal(1);
        })
        .catch(err => {
          throw err;
        });
    });
  });
  describe('Update unit ---> PUT /unit/:id', () => {
    it('should return updated unit data', () => {
      const payload = {
        name: 'Month',
      };
      return chai
        .request(server)
        .put(`/unit/${unitId}`)
        .set('x-access-token', token)
        .send(payload)
        .then(res => {
          expect(res).to.have.status(200);
          expect(res.body.response).to.have.property('unit');
          expect(res.body.response.unit).to.have.property('name', 'Month');
        })
        .catch(err => {
          throw err;
        });
    });
  });
  describe('Delete unit ---> DELETE /unit/:id', () => {
    it('should delete unit', () => {
      return chai
        .request(server)
        .delete(`/unit/${unitId}`)
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
