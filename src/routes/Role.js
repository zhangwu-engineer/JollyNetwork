/**
 * Role Route Handler
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Promise = require('bluebird');
const asyncMiddleware = require('../lib/AsyncMiddleware');
const buildContext = require('../analytics/helper/buildContext');
const IdentityAnalytics = require('../analytics/identity');
let authService = JOLLY.service.Authentication,
  userController = JOLLY.controller.UserController,
  businessController = JOLLY.controller.BusinessController,
  workController = JOLLY.controller.WorkController,
  endorsementController = JOLLY.controller.EndorsementController,
  roleController = JOLLY.controller.RoleController;


/**
 * Display user's roles.
 */
router.get('/', authService.verifyUserAuthentication, (req, res, next) => {

  roleController
    .getUserRoles(req.userId)
    .then((roles) =>
      Promise.map(roles, (role) => {
        return new Promise((resolve, reject) => {
          workController
            .getUserVerifiedWorksForRole(req.userId, role.name)
            .then(count => {
              const newRole = role;
              newRole.verifiedJobs = count;
              resolve(newRole);
            })
            .catch(reject);
        });
      })
    )
    .then((roles) =>
      Promise.map(roles, (role) => {
        return new Promise((resolve, reject) => {
          endorsementController
            .getUserEndorsementsForRole(req.userId, role.name)
            .then(count => {
              const newRole = role;
              newRole.endorsements = count;
              resolve(newRole);
            })
            .catch(reject);
        });
      })
    )
    .then((roles) => {
      res.apiSuccess({
        roles,
      });
    })
    .catch(next);
});

router.get('/business', authService.verifyUserAuthentication, (req, res, next) => {

  roleController
    .getBusinessRoles(req.params.business_id)
    .then((roles) => {
      res.apiSuccess({
        roles,
      });
		})
		.catch(next);
});

router.get('/user/:slug', (req, res, next) => {
  let user;
  userController.getUserBySlug(req.params.slug)
    .then(userData => {
      user = userData;
      return roleController.getUserRoles(userData.id);
    })
    .then((roles) =>
      Promise.map(roles, (role) => {
        return new Promise((resolve, reject) => {
          workController
            .getUserVerifiedWorksForRole(user.id, role.name)
            .then(count => {
              const newRole = role;
              newRole.verifiedJobs = count;
              resolve(newRole);
            })
            .catch(reject);
        });
      })
    )
    .then((roles) =>
      Promise.map(roles, (role) => {
        return new Promise((resolve, reject) => {
          endorsementController
            .getUserEndorsementsForRole(user.id, role.name)
            .then(count => {
              const newRole = role;
              newRole.endorsements = count;
              resolve(newRole);
            })
            .catch(reject);
        });
      })
    )
    .then((roles) => {
      res.apiSuccess({
        roles,
      });
    })
    .catch(next);
});

router.get('/business/:slug', (req, res, next) => {
  let business;
  businessController.getBusinessBySlug(req.params.slug)
    .then(businessData => {
      business = businessData;
      return roleController.getBusinessRoles(businessData.id);
    })
    .then((roles) => {
      res.apiSuccess({
        roles,
      });
    })
    .catch(next);
});

/**
 * create new role into system.
 */
router.post('/', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  const headers = buildContext(req);
  const identityAnalytics = new IdentityAnalytics(JOLLY.config.SEGMENT.WRITE_KEY, headers);
  const rolesData = await Promise.map(req.body.roles, role => roleController.addRole(Object.assign({}, role, {
    user_id: req.userId, headers: buildContext(req), business_id: req.body.business_id
  })));
  identityAnalytics.send(req.userId);
  res.apiSuccess({
    roles: rolesData
  });
}));

router.put('/:id', authService.verifyUserAuthentication, (req, res, next) => {
  const headers = buildContext(req);
  const identityAnalytics = new IdentityAnalytics(JOLLY.config.SEGMENT.WRITE_KEY, headers);
  roleController
    .updateRole(req.params.id, req.body)
    .then((roleData) => {
      identityAnalytics.send(req.userId);
      res.apiSuccess({
        role: roleData.toJson({}),
      });
    })
    .catch(next);
});

router.delete('/:id', authService.verifyUserAuthentication, (req, res, next) => {
  const headers = buildContext(req);
  const identityAnalytics = new IdentityAnalytics(JOLLY.config.SEGMENT.WRITE_KEY, headers);
  roleController
    .deleteRole(req.params.id)
    .then(() => {
      identityAnalytics.send(req.userId);
      res.apiSuccess({});
    })
    .catch(next);
});

router.get('/clean-date-started', (req, res, next) => {
  roleController
    .cleanDateStarted()
    .then(() => {
      res.apiSuccess({});
    })
    .catch(next);
});

module.exports = router;
