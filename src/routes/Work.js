/**
 * Unit Route Handler
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Promise = require('bluebird');
const WorkAnalytics = require('../analytics/work');
const buildContext = require('../analytics/helper/buildContext');
const asyncMiddleware = require('../lib/AsyncMiddleware');
let authService = JOLLY.service.Authentication,
  workController = JOLLY.controller.WorkController,
  tokenController = JOLLY.controller.TokenController,
  userController = JOLLY.controller.UserController;


/**
 * Display user's works.
 */
router.get('/', authService.verifyUserAuthentication, (req, res, next) => {
  workController
    .getUserWorks(req.userId)
    .then((works) =>
      Promise.map(works, (work) => {
        return new Promise((resolve, reject) => {
          userController
            .getUserById(work.user)
            .then(user => {
              const populatedWork = work;
              populatedWork.user = user;
              resolve(populatedWork);
            })
            .catch(reject);
        });
      })
    )
    .then((works) =>
      Promise.map(works, (work) => {
        return new Promise((resolve, reject) => {
          workController
            .findWorkUsers(work.id)
            .then(users => {
              const coworkers = users.filter(i => i.type !== 'invited')
              const populatedWork = work;
              populatedWork.numberOfCoworkers = coworkers.length;
              resolve(populatedWork);
            })
            .catch(reject);
        });
      })
    )
    .then(populatedWorks => {
      res.apiSuccess({
        work_list: populatedWorks
      });
    })
    .catch(next);
});

router.get('/user/:slug', (req, res, next) => {
  userController.getUserBySlug(req.params.slug)
    .then(userData => {
      return workController.getUserWorks(userData.id);
    })
    .then((works) =>
      Promise.map(works, (work) => {
        return new Promise((resolve, reject) => {
          userController
            .getUserById(work.user)
            .then(user => {
              const populatedWork = work;
              populatedWork.user = user;
              resolve(populatedWork);
            })
            .catch(reject);
        });
      })
    )
    .then((works) =>
      Promise.map(works, (work) => {
        return new Promise((resolve, reject) => {
          workController
            .findWorkUsers(work.id)
            .then(users => {
              const coworkers = users.filter(i => i.type !== 'invited')
              const populatedWork = work;
              populatedWork.numberOfCoworkers = coworkers.length;
              resolve(populatedWork);
            })
            .catch(reject);
        });
      })
    )
    .then(populatedWorks => {
      res.apiSuccess({
        work_list: populatedWorks
      });
    })
    .catch(next);
});

/**
 * create new work into system.
 */
router.post('/', authService.verifyUserAuthentication, (req, res, next) => {
  userController.getUserById(req.userId)
    .then(user => {
      return Promise.map(req.body.jobs, job => {
        let params = Object.assign({}, job, { user: req.userId, email: user.email, firstName: user.firstName,
          lastName: user.lastName, userSlug: user.slug, headers: buildContext(req)});
        return workController.addWork(params);
      });
    })
    .then(() => {
      res.apiSuccess({});
    })
    .catch(next);
});

router.post('/search', (req, res, next) => {
	workController
		.searchWorks(req.body)
		.then((works) =>
      Promise.map(works, (work) => {
        return new Promise((resolve, reject) => {
          userController
            .getUserById(work.user)
            .then(user => {
              const populatedWork = work;
              populatedWork.user = user;
              resolve(populatedWork);
            })
            .catch(reject);
        });
      })
    )
    .then((works) =>
      Promise.map(works, (work) => {
        return new Promise((resolve, reject) => {
          Promise.map(
            work.verifiers,
            (verifier) => userController.getUserById(verifier)
          )
          .then(verifiers => {
            const populatedWork = work;
            populatedWork.verifiers = verifiers;
            resolve(populatedWork);
          })
          .catch(reject);
        });
      })
    )
    .then(populatedWorks => {
      res.apiSuccess({
        work: populatedWorks
      });
    })
    .catch(next);
});

router.get('/:id/user', (req, res, next) => {
  const emailRegEx = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  workController
		.findWorkUsers(req.params.id)
		.then((users) =>
			Promise.map(users, (user) => {
        if (emailRegEx.test(user.user)) {
          return {
            type: user.type,
            user: {
              email: user.user,
            }
          };
        } else {
          return new Promise((resolve, reject) => {
            userController
              .getUserById(user.user)
              .then(u => {
                const populatedUser = user;
                populatedUser.user = u;
                resolve(populatedUser);
              })
              .catch(e => {
                resolve(null);
              });
          });
        }
      })
    )
    .then(populatedUsers => {
      const validUsers = populatedUsers.filter(u => !!u);
      res.apiSuccess({
        users: validUsers
      });
    })
    .catch(next);
});

router.post('/:id/addCoworker', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  const headers = buildContext(req);
  const user = await userController.getUserById(req.userId);
  const params = { id: req.params.id, coworker: req.body.coworker, user: user, headers: headers };
  const tokens = await workController.addCoworker(params);
  await Promise.map(tokens, (token) => {
    return new Promise((resolve, reject) => {
      tokenController
        .addToken({ token })
        .then(() => {
          resolve();
        })
        .catch(reject);
    });
  });
  await userController.checkConnectedBadge(req.userId, headers);
  res.apiSuccess({});
}));

router.post('/:id/verifyCoworker', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  const headers = buildContext(req);
  const workAnalytics = new WorkAnalytics(JOLLY.config.SEGMENT.WRITE_KEY, headers);
  const work = await workController.findWorkById(req.params.id);
  const workData = work.toJson({});
  await workController.verifyCoworker(req.params.id, Object.assign({}, req.body, { verifier: req.userId }));
  workAnalytics.coworkerTaggedVerified(req.userId, workData, { coworker: req.body.coworker});
  await userController.checkConnectedBadge(req.userId, headers);
  res.apiSuccess({});
}));

router.post('/invite', (req, res, next) => {
  const authSecret = JOLLY.config.APP.AUTHENTICATION_SECRET;
  tokenController
    .isValidToken(req.body.token)
    .then(() => {
      jwt.verify(req.body.token, authSecret, (err, decoded) => {
        if (err) {
          next (new ApiError(err.message || 'Invalid token.'));
        } else {
          res.apiSuccess({
            workId: decoded.workId,
            tagger: decoded.tagger,
            startFrom: decoded.startFrom,
          });
        }
      });
    }).catch(next);
});

router.post('/invite/accept', authService.verifyUserAuthentication, (req, res, next) => {
  userController
    .getUserById(req.userId)
    .then(user => {
      return userController.acceptInvite({ invite: req.body, user, headers: buildContext(req) });
    })
    .then(() => {
      res.apiSuccess({});
    }).catch(next);
});

module.exports = router;
