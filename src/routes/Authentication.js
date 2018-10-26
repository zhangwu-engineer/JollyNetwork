/**
 * Authentication Route Handler Class
 */
const router = require('express').Router();
const passport = require('passport');

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

	let {email, password} = req.body,
		authToken,
		userData;

    userController.findUserByEmail({
        email
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

router.post('/facebook', passport.authenticate('facebook-token'), (req, res, next) => {
    const data = {
        firstName: req.user.name.givenName,
        lastName: req.user.name.familyName,
        email: req.user.emails[0].value,
    };
    userController.findUserByEmail({
        email: data.email,
    }).then((userObject) => {
        if ( !userObject ) {
            userController
                .registerUser(data)
                .then((userData) => {
                    authToken = authService.generateToken({
                        userId: userData.id
                    });
                    res.apiSuccess({
                        auth_token: authToken,
                    });
                });
        } else {
            userData = userObject.toJson({
                isSafeOutput: true
            });
            authToken = authService.generateToken({
                userId: userData.id
            });
            res.apiSuccess({
                auth_token: authToken,
            });
        }
    }).catch(next);
});

router.post('/linkedin', passport.authenticate('linkedin-oauth-token'), (req, res, next) => {
  const data = {
      firstName: req.user.name.givenName,
      lastName: req.user.name.familyName,
      email: req.user.emails[0].value,
  };
  userController.findUserByEmail({
      email: data.email,
  }).then((userObject) => {
      if ( !userObject ) {
          userController
              .registerUser(data)
              .then((userData) => {
                  authToken = authService.generateToken({
                      userId: userData.id
                  });
                  res.apiSuccess({
                      auth_token: authToken,
                  });
              });
      } else {
          userData = userObject.toJson({
              isSafeOutput: true
          });
          authToken = authService.generateToken({
              userId: userData.id
          });
          res.apiSuccess({
              auth_token: authToken,
          });
      }
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
