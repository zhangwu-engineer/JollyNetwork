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

/**
 * User information route
 */
router.get('/me', (req, res) => {

	userController.findUser((user) => {

		res.apiSuccess({
			user: user.toJson()
		});

	});

});

/**
 * Register new user into system.
 */
router.post('/register', (req, res) => {

	userController
		.registerUser(req.body)
		.then((userData) => {
			const token = jwt.sign({ id: userData.id }, JOLLY.config.APP.AUTHENTICATION_SECRET);
			res.apiSuccess({
				auth_token: token, 
				user: userData
			});
		});
});


module.exports = router;
