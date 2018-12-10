/**
 * Unit Route Handler
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');

let authService = JOLLY.service.Authentication,
	workController = JOLLY.controller.WorkController;


/**
 * Display user's works.
 */
router.get('/', authService.verifyUserAuthentication, (req, res) => {

  workController
    .getUserWorks(req.userId)
    .then((userWorkList) => {
      res.apiSuccess({
        work_list: userWorkList
      });
    });
});

/**
 * create new unit into system.
 */
router.post('/', authService.verifyUserAuthentication, (req, res) => {

	workController
		.addWork(Object.assign({}, req.body, { user_id: req.userId }))
		.then((workData) => {
			res.apiSuccess({
				work: workData
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
