/**
 * Unit Route Handler
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Promise = require('bluebird');

let authService = JOLLY.service.Authentication,
  userController = JOLLY.controller.UserController;
	endorsementController = JOLLY.controller.EndorsementController;


/**
 * Display user's endorsements.
 */
router.get('/', authService.verifyUserAuthentication, (req, res, next) => {

  endorsementController
    .getUserEndorsements(req.userId)
    .then((endorsements) =>
      Promise.map(endorsements, (endorser) => {
        return new Promise((resolve, reject) => {
          userController
            .getUserById(endorser.from)
            .then(user => {
              const populatedData = endorser;
              populatedData.from = user;
              resolve(populatedData);
            })
            .catch(reject);
        });
      })
    )
    .then((populatedEndorsers) => {
      res.apiSuccess({
        endorsements: populatedEndorsers
      });
    })
    .catch(next);
});

router.get('/user/:slug', (req, res, next) => {

  userController.getUserBySlug(req.params.slug)
    .then(userData => {
      return endorsementController.getUserEndorsements(userData.id);
    })
    .then((endorsements) =>
      Promise.map(endorsements, (endorser) => {
        return new Promise((resolve, reject) => {
          userController
            .getUserById(endorser.from)
            .then(user => {
              const populatedData = endorser;
              populatedData.from = user;
              resolve(populatedData);
            })
            .catch(reject);
        });
      })
    )
    .then((populatedEndorsers) => {
      res.apiSuccess({
        endorsements: populatedEndorsers
      });
    })
    .catch(next);
});

router.get('/work/:workId', authService.verifyUserAuthentication, (req, res, next) => {

  endorsementController
    .getEndorsementsForWork(req.params.workId, req.userId)
    .then((endorsements) => {
      res.apiSuccess({
        endorsements: endorsements
      });
    })
    .catch(next);
});

router.post('/work/:workSlug/endorsers', (req, res, next) => {

  userController.getUserBySlug(req.body.userSlug)
    .then(userData => {
      return endorsementController.getEndorsersForWork(req.params.workSlug, userData.id);
    })
    .then((endorsers) =>
      Promise.map(endorsers, (endorser) => {
        return new Promise((resolve, reject) => {
          userController
            .getUserById(endorser.from)
            .then(user => {
              const populatedData = endorser;
              populatedData.from = user;
              resolve(populatedData);
            })
            .catch(reject);
        });
      })
    )
    .then((populatedEndorsers) => {
      res.apiSuccess({
        endorsers: populatedEndorsers
      });
    })
    .catch(next);
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
