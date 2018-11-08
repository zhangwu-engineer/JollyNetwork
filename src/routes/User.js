/**
 * User Route Handler
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');

let authService = JOLLY.service.Authentication,
	userController = JOLLY.controller.UserController;


/**
 * Display user's information.
 */
router.get('/', authService.verifyUserAuthentication, (req, res) => {

	userController.listUsers((userList) => {

		res.apiSuccess({
			user_list: userList
		});

	});

});

router.get('/slug/:slug', (req, res, next) => {
	userController.getUserBySlug(req.params.slug)
		.then(userData => {
      res.apiSuccess(userData);
		}).catch(next);

});


router.put('/:id', authService.verifyUserAuthentication, (req, res, next) => {
  userController.updateUser(req.params.id, req.body)
    .then(userData => {
      res.apiSuccess(userData);
    })
    .catch(next);

});
/**
 * User information route
 */
router.get('/me', authService.verifyUserAuthentication, (req, res, next) => {
	userController.getUserById(req.userId)
		.then(userData => {
      res.apiSuccess(userData);
		}).catch(next);

});

/**
 * Register new user into system.
 */
router.post('/register', (req, res, next) => {

	userController
		.registerUser(req.body)
		.then((userData) => {
			authToken = authService.generateToken({
				userId: userData.id
			});
			res.apiSuccess({
				auth_token: authToken,
			});
		}).catch(next);
});

router.post('/verify-email', authService.verifyUserEmail, (req, res, next) => {
  userController.verifyUserEmail(req.userId)
    .then(userData => {
      res.apiSuccess(userData);
    })
    .catch(next);
});

module.exports = router;
