/**
 * Unit Route Handler
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Promise = require('bluebird');

let authService = JOLLY.service.Authentication,
  workController = JOLLY.controller.WorkController,
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

	workController
		.addWork(Object.assign({}, req.body, { user: req.userId }))
		.then((workData) => {
			res.apiSuccess({
				work: workData
			});
    })
    .catch(next);
});

router.post('/search', authService.verifyUserAuthentication, (req, res, next) => {
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
    .then(populatedWorks => {
      res.apiSuccess({
        work: populatedWorks
      });
    })
    .catch(next);
});

router.get('/:id/user', authService.verifyUserAuthentication, (req, res, next) => {
	workController
		.findWorkUsers(req.params.id)
		.then((users) =>
			Promise.map(users, (user) => {
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
  workController
		.addCoworker(req.params.id, req.body.coworker)
		.then(() => {
      res.apiSuccess({});
    })
    .catch(next)
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
