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
let talentId = '';

describe('Talent', () => {
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
    ['users', 'profiles', 'talents'],
    collectionName => JOLLY.service.Db.database(JOLLY.enum.DbNames.DB).collection(collectionName).deleteMany({}),
    { concurrency: 1 }
  ));
  describe('Create user talent ---> POST /talent', () => {
    it('should return newly created talent data', () => {
      const payload = {
        name: 'Web Development',
        rate: '50.56',
        unit: 'hour',
      };
      return chai
        .request(server)
        .post('/talent')
        .set('x-access-token', token)
        .send(payload)
        .then(res => {
          expect(res).to.have.status(200);
          expect(res.body.response).to.have.property('talent');
          expect(res.body.response.talent).to.have.property('name', 'Web Development');
          talentId = res.body.response.talent.id;
        })
        .catch(err => {
          throw err;
        });
    });
  });
  describe('Get user talent ---> GET /talent', () => {
    it('should return user\'s talent data', () => {
      return chai
        .request(server)
        .get('/talent')
        .set('x-access-token', token)
        .send()
        .then(res => {
          expect(res).to.have.status(200);
          expect(res.body.response.talent_list.length).to.be.equal(1);
        })
        .catch(err => {
          throw err;
        });
    });
  });
  describe('Get member talent ---> GET /talent/user/:slug', () => {
    it('should return user\'s talent data', () => {
      return chai
        .request(server)
        .get(`/talent/user/akira-matsui`)
        .send()
        .then(res => {
          expect(res).to.have.status(200);
          expect(res.body.response.talent_list.length).to.be.equal(1);
        })
        .catch(err => {
          throw err;
        });
    });
  });
  describe('Update talent ---> PUT /talent/:id', () => {
    it('should return updated talent data', () => {
      const payload = {
        name: 'Web Development',
        rate: '60',
        unit: 'hour',
      };
      return chai
        .request(server)
        .put(`/talent/${talentId}`)
        .set('x-access-token', token)
        .send(payload)
        .then(res => {
          expect(res).to.have.status(200);
          expect(res.body.response).to.have.property('talent');
          expect(res.body.response.talent).to.have.property('rate', '60');
        })
        .catch(err => {
          throw err;
        });
    });
  });
  describe('Delete talent ---> DELETE /talent/:id', () => {
    it('should delete talent', () => {
      return chai
        .request(server)
        .delete(`/talent/${talentId}`)
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
