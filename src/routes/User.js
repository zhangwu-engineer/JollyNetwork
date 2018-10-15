/**
 * User Route Handler
 */
const router = require('express').Router();

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

			res.apiSuccess(userData);

		});
});


module.exports = router;
