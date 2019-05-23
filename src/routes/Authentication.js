/**
 * Authentication Route Handler Class
 */
const router = require('express').Router();
const passport = require('passport');
const SystemUserRoles = require('../enum/SystemUserRoles');

/** Define/Import system defined dependencies */
let userController = JOLLY.controller.UserController,
  mailService = JOLLY.service.Mail;
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
            throw new ApiError('The email or password entered is incorrect', 404);
        }

        userData = userObject.toJson({
          isSafeOutput: true
        });

        if (userObject.getPassword() === null) {
          return mailService.sendPasswordResetEmail(userData);
        } else {
          if ( !authService.verifyPassword(password, userObject.getPassword()) ) {
            throw new ApiError('The email or password entered is incorrect', 404);
          }

          if (req.body.invite) {
            userController.acceptInvite(req.body.invite, userData);
          }

          authToken = authService.generateToken({
              userId: userData.id
          });

          res.apiSuccess({
            auth_token: authToken,
            user: userData,
          });
        }
    })
    .catch(next);

});

router.post('/facebook', passport.authenticate('facebook-token'), (req, res, next) => {
    const data = {
        firstName: req.user.name.givenName,
        lastName: req.user.name.familyName,
        email: req.user.emails[0].value,
        isBusiness: req.body.isBusiness,
        invite: req.body.invite,
    };
    if (req.user.photos && req.user.photos.length) {
      data.avatar = req.user.photos[0].value;
    }
    userController.findUserByEmail({
        email: data.email,
    }).then((userObject) => {
        if ( !userObject ) {
            userController
                .registerUser(data)
                .then((userData) => {

                    // if (req.body.invite) {
                    //   userController.acceptInvite(req.body.invite, userData);
                    // }

                    authToken = authService.generateToken({
                        userId: userData.id
                    });
                    res.apiSuccess({
                        auth_token: authToken,
                        action: 'signup',
                        type: 'facebook',
                        user: userData,

                    });
                });
        } else {
            userData = userObject.toJson({
                isSafeOutput: true
            });

            if (req.body.invite) {
              userController.acceptInvite(req.body.invite, userData);
            }

            authToken = authService.generateToken({
                userId: userData.id
            });
            res.apiSuccess({
                auth_token: authToken,
                action: 'login',
                type: 'facebook',
                user: userData,
            });
        }
    }).catch(next);
});

router.post('/linkedin', passport.authenticate('linkedin-oauth-token'), (req, res, next) => {
  const data = {
      firstName: req.user.name.givenName,
      lastName: req.user.name.familyName,
      email: req.user.emails[0].value,
      isBusiness: req.body.isBusiness,
      invite: req.body.invite,
  };
  if (req.user.photos && req.user.photos.length) {
    data.avatar = req.user.photos[0];
  }
  userController.findUserByEmail({
      email: data.email,
  }).then((userObject) => {
      if ( !userObject ) {
          userController
              .registerUser(data)
              .then((userData) => {
                  // if (req.body.invite) {
                  //   userController.acceptInvite(req.body.invite, userData);
                  // }

                  authToken = authService.generateToken({
                      userId: userData.id
                  });
                  res.apiSuccess({
                      auth_token: authToken,
                      action: 'signup',
                      type: 'linkedin',
                      user: userData,
                  });
              });
      } else {
          userData = userObject.toJson({
              isSafeOutput: true
          });
          if (req.body.invite) {
            userController.acceptInvite(req.body.invite, userData);
          }

          authToken = authService.generateToken({
              userId: userData.id
          });
          res.apiSuccess({
              auth_token: authToken,
              action: 'login',
              type: 'linkedin',
              user: userData,
          });
      }
  }).catch(next);
});

router.post('/forgot-password', (req, res, next) => {
  userController
    .findUserByEmail(req.body)
    .then(userObject => {
      if (userObject) {
        userData = userObject.toJson({
          isSafeOutput: true
        });
        return mailService.sendPasswordResetEmail(userData);
      } else {
        throw new ApiError('Email not found');
      }
    })
    .then(result => {
      res.apiSuccess(result);
    }).catch(next);
});

router.post('/reset-password', authService.verifyUserEmail, (req, res, next) => {
  userController.updateUserPassword(Object.assign({}, req.body, { userId: req.userId }))
    .then(userData => {
      res.apiSuccess(userData);
    })
    .catch(next);
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

router.post('/admin-login', (req, res, next) => {

	let {email, password} = req.body,
		authToken,
		userData;

    userController.findUserByEmail({
        email,
        role: SystemUserRoles.ADMIN,
    }).then((userObject) => {

        if ( !userObject ) {
            throw new ApiError('The email or password entered is incorrect', 404);
        }

        userData = userObject.toJson({
          isSafeOutput: true
        });

        if (userObject.getPassword() === null) {
          return mailService.sendPasswordResetEmail(userData);
        } else {
          if ( !authService.verifyPassword(password, userObject.getPassword()) ) {
            throw new ApiError('The email or password entered is incorrect', 404);
          }

          authToken = authService.generateToken({
              userId: userData.id
          });

          res.apiSuccess({
            auth_token: authToken,
            user: userData,
          });
        }
    })
    .catch(next);

});

module.exports = router;
