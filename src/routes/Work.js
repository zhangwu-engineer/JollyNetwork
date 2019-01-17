/**
 * Unit Route Handler
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Promise = require('bluebird');

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
 * create new unit into system.
 */
router.post('/', authService.verifyUserAuthentication, (req, res, next) => {
  let work = null;
  userController.getUserById(req.userId)
    .then(user => {
      return workController.addWork(Object.assign({}, req.body, { user: req.userId, firstName: user.firstName, lastName: user.lastName, userSlug: user.slug }));
    })
    .then((result) => {
      work = result.work;
      return Promise.map(result.tokens, (token) => {
        return new Promise((resolve, reject) => {
          tokenController
            .addToken({ token })
            .then(() => {
              resolve();
            })
            .catch(reject);
        });
      });
    })
    .then(() => {
      res.apiSuccess({
				work: work
			});
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
              .catch(reject);
          });
        }
      })
    )
    .then(populatedUsers => {
      res.apiSuccess({
        users: populatedUsers
      });
    })
    .catch(next);
});

router.post('/:id/addCoworker', authService.verifyUserAuthentication, (req, res, next) => {
  userController
    .getUserById(req.userId)
    .then((user) => {
      return workController.addCoworker(req.params.id, req.body.coworker, user);
    })
		.then((tokens) => {
      return Promise.map(tokens, (token) => {
        return new Promise((resolve, reject) => {
          tokenController
            .addToken({ token })
            .then(() => {
              resolve();
            })
            .catch(reject);
        });
      });
    })
    .then(() => {
      res.apiSuccess({});
    })
    .catch(next)
});

router.post('/:id/verifyCoworker', authService.verifyUserAuthentication, (req, res, next) => {
  workController
		.verifyCoworker(req.params.id, Object.assign({}, req.body, { verifier: req.userId }))
		.then(() => {
      res.apiSuccess({});
    })
    .catch(next)
});

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
// router.put('/:id', authService.verifyUserAuthentication, (req, res) => {
// 	unitController
// 		.updateUnit(req.params.id, req.body)
// 		.then((unitData) => {
// 			res.apiSuccess({
// 				unit: unitData.toJson({}),
// 			});
// 		});
// });

// router.delete('/:id', authService.verifyUserAuthentication, (req, res) => {

// 	unitController
// 		.deleteUnit(req.params.id)
// 		.then(() => {
// 			res.apiSuccess({});
// 		});
// });

module.exports = router;
