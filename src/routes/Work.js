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

router.get('/:id', authService.verifyUserAuthentication, (req, res) => {
	workController
		.findWorkById(req.params.id)
		.then((workData) => {
			res.apiSuccess({
				work: workData.toJson({}),
			});
		});
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
