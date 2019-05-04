/**
 * User Route Handler
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Promise = require('bluebird');
const asyncMiddleware = require('../lib/AsyncMiddleware');
const checkEmail = require('../lib/CheckEmail');
ConnectionStatus = require('../enum/ConnectionStatus');
let authService = JOLLY.service.Authentication,
  smsService = JOLLY.service.SMS,
  mailService = JOLLY.service.Mail,
  userController = JOLLY.controller.UserController,
  fileController = JOLLY.controller.FileController,
  workController = JOLLY.controller.WorkController,
  connectionController = JOLLY.controller.ConnectionController,
  tokenController = JOLLY.controller.TokenController;

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

router.post('/search', authService.verifyUserAuthentication, (req, res, next) => {

  userController
    .findUserByKeyword(Object.assign({}, req.body, { user_id: req.userId }))
    .then((userIds) =>
      Promise.map(userIds, (userId) => {
        return new Promise((resolve, reject) => {
          userController
            .getUserById(userId)
            .then(user => {
              resolve(user);
            })
            .catch(reject);
        });
      })
    )
    .then(users => {
      res.apiSuccess({
        user_list: users
      });
    })
    .catch(next);

});

router.get('/slug/:slug', (req, res, next) => {
	userController.getUserBySlug(req.params.slug)
		.then(userData => {
      res.apiSuccess(userData);
		}).catch(next);

});

router.get('/slug/:slug/files', (req, res, next) => {
	userController.getUserBySlug(req.params.slug)
    .then(userData => fileController.getUserFiles(userData.id))
    .then(files => {
      res.apiSuccess(files);
    })
    .catch(next);

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
        user: userData,
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

router.post('/verify-phone', authService.verifyUserAuthentication, (req, res, next) => {
  userController.verifyUserPhone(req.userId, req.body)
    .then(() => {
      return tokenController.addToken({ token: authService.generatePhoneVerificationToken() })
    })
    .then(tokenData => {
      if (req.body.slug.indexOf('akira-matsui') === -1 && req.body.slug.indexOf('masaaki-tamura') === -1) {
        smsService.sendSMS(req.body.phone, `Here's your verification code! Thanks! Jolly Team. ${tokenData.token}`);
      }
      res.apiSuccess(tokenData);
    })
    .catch(next);
});

router.post('/verify-phone-token', authService.verifyUserAuthentication, (req, res, next) => {
  tokenController.verify(req.body.token)
    .then(() => {
      return userController.updateUser(req.userId, { profile: { verifiedPhone: true } });
    })
    .then(() => {
      res.apiSuccess();
    })
    .catch(next);
});

router.post('/image', authService.verifyUserAuthentication, (req, res, next) => {
  userController.uploadImage(req.userId, req.body.image)
    .then(path => fileController.addFile({ path, user_id: req.userId }))
    .then(fileData => {
      res.apiSuccess(fileData);
    })
    .catch(next);
});

router.post('/resume', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  const path = await userController.uploadResume(req.userId, req.body.resume);
  res.apiSuccess({ resume: path });
}));

router.delete('/:id/resume', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  await userController.deleteResume(req.userId)
  res.apiSuccess({});
}));

router.get('/files', authService.verifyUserAuthentication, (req, res, next) => {
  fileController.getUserFiles(req.userId)
    .then(files => {
      res.apiSuccess(files);
    })
    .catch(next);
});

router.post('/city', authService.verifyUserAuthentication, (req, res, next) => {
  userController.searchCityUsers(req.body.city, req.body.query, req.body.page, req.body.perPage, req.userId)
    .then(data => {
      res.apiSuccess(data);
    })
    .catch(next);
});

router.post('/signup-invite', authService.verifyUserAuthentication, (req, res, next) => {
  userController
    .getUserById(req.userId)
    .then(user => {
      return  mailService.sendSignupInvite(req.body.email, user);
    })
    .then(() => {
      res.apiSuccess({});
    })
    .catch(next);
});

router.get('/:id/coworkers', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  const user = await userController.getUserById(req.params.id);
  const connections1 = await connectionController
    .findConnections({ to: { $in: [req.params.id, user.email] }, status: ConnectionStatus.CONNECTED});
  const coworkersFromConnection1 = connections1.map(connection => connection.from);
  const connections2 = await connectionController
    .findConnections({ from: req.params.id, status: ConnectionStatus.CONNECTED});
  const coworkersFromConnection2 = connections2.map(connection => connection.to);
  const connectionCoworkerIds = coworkersFromConnection1.concat(coworkersFromConnection2);

  const works = await workController.getUserWorks(req.params.id);
  const workSlugs = works.map(work => work.slug);
  const allWorks = await workController.getWorksBySlugs(workSlugs, req.params.id);
  const workCoworkerIds = allWorks.map(work => work.user.toString());

  const coworkerIds = connectionCoworkerIds.concat(workCoworkerIds).filter((v, i, arr) => arr.indexOf(v) === i);

  const coworkers = await Promise.map(coworkerIds, coworkerId =>
    checkEmail(coworkerId)
      ? userController.getUserByEmail(coworkerId)
      : userController.getUserById(coworkerId)
    );

  res.apiSuccess({
    coworkers,
  });
}));

router.get('/:id/badges', asyncMiddleware(async (req, res, next) => {
  const badges = await userController.getUserBadges(req.params.id);
  res.apiSuccess(badges);
}));


module.exports = router;
