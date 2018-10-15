/**
 * Authentication Route Handler Class
 */
const router = require('express').Router();

/** Define/Import system defined dependencies */
let userController = JOLLY.controller.UserController,
	authService = JOLLY.service.Authentication;

/**
 * User login route.
 * @params {String} username
 * @params {String} password
 * @public
 */
router.post('/login', (req, res, next) => {

	let {username, password} = req.body,
		authToken,
		userData;

    userController.findUserByUsername({
        username
    }).then((userObject) => {

        if ( !userObject ) {
            throw new ApiError('Unable to find user', 404);
        }

        if ( !authService.verifyPassword(password, userObject.getPassword()) ) {
            throw new ApiError('Invalid password', 404);
        }

        userData = userObject.toJson({
            isSafeOutput: true
        });

        authToken = authService.generateToken({
            userId: userData.id
        });

        res.apiSuccess({
            auth_token: authToken,
            user: userData
        });

    }).catch(next);

});


/**
 * Verify user authentication token route.
 * @public
 */
router.get('/verify', authService.verifyUserAuthentication, (req, res) => {

    res.apiSuccess({
        userId: req.userId
    });

});


/**
 * User logout route.
 * @public
 */
router.get('/logout', authService.verifyUserAuthentication, (req, res) => {

	res.apiSuccess({
		userId: req.userId
	});

});

module.exports = router;