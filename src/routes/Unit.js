/**
 * Unit Route Handler
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');

let authService = JOLLY.service.Authentication,
	unitController = JOLLY.controller.UnitController;


/**
 * Display user's units.
 */
router.get('/', authService.verifyUserAuthentication, (req, res) => {

  unitController
    .getUserUnits(req.userId)
    .then((userUnitList) => {
      res.apiSuccess({
        unit_list: userUnitList
      });
    });
});

/**
 * create new unit into system.
 */
router.post('/', authService.verifyUserAuthentication, (req, res) => {

	unitController
		.addUnit(Object.assign({}, req.body, { user_id: req.userId }))
		.then((unitData) => {
			res.apiSuccess({
				unit: unitData
			});
		});
});

router.put('/:id', authService.verifyUserAuthentication, (req, res) => {
	unitController
		.updateUnit(req.params.id, req.body)
		.then((unitData) => {
			res.apiSuccess({
				unit: unitData.toJson({}),
			});
		});
});

router.delete('/:id', authService.verifyUserAuthentication, (req, res) => {

	unitController
		.deleteUnit(req.params.id)
		.then(() => {
			res.apiSuccess({});
		});
});

module.exports = router;
