/**
 * Unit Route Handler
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');

let authService = JOLLY.service.Authentication,
	endorsementController = JOLLY.controller.EndorsementController;


/**
 * Display user's endorsements.
 */
router.get('/', authService.verifyUserAuthentication, (req, res) => {

  endorsementController
    .getUserEndorsements(req.userId)
    .then((endorsements) => {
      res.apiSuccess({
        endorsements: endorsements
      });
    });
});

router.get('/work/:workId', authService.verifyUserAuthentication, (req, res) => {

  endorsementController
    .getEndorsementsForWork(req.params.workId, req.userId)
    .then((endorsements) => {
      res.apiSuccess({
        endorsements: endorsements
      });
    });
});

/**
 * create new endorsement into system.
 */
router.post('/', authService.verifyUserAuthentication, (req, res, next) => {

	endorsementController
		.addEndorsement(Object.assign({}, req.body, { from: req.userId }))
		.then((endorsementData) => {
			res.apiSuccess({
				endorsement: endorsementData
			});
    })
    .catch(next);
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
