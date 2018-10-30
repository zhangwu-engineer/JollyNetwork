/**
 * Talent Route Handler
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');

let authService = JOLLY.service.Authentication,
	talentController = JOLLY.controller.TalentController;


/**
 * Display user's talents.
 */
router.get('/', authService.verifyUserAuthentication, (req, res) => {

  talentController
    .getUserTalents(req.userId)
    .then((userTalentList) => {
      res.apiSuccess({
        talent_list: userTalentList
      });
    });
});

/**
 * create new talent into system.
 */
router.post('/', authService.verifyUserAuthentication, (req, res) => {

	talentController
		.addTalent(Object.assign({}, req.body, { user_id: req.userId }))
		.then((talentData) => {
			res.apiSuccess({
				talent: talentData
			});
		});
});

router.put('/:id', authService.verifyUserAuthentication, (req, res) => {
  console.log(req.body);
	talentController
		.updateTalent(req.params.id, req.body)
		.then((talentData) => {
			res.apiSuccess({
				talent: talentData.toJson({}),
			});
		});
});

router.delete('/:id', authService.verifyUserAuthentication, (req, res) => {

	talentController
		.deleteTalent(req.params.id)
		.then(() => {
			res.apiSuccess({});
		});
});

module.exports = router;
