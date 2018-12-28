/**
 * Role Route Handler
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');

let authService = JOLLY.service.Authentication,
  userController = JOLLY.controller.UserController
	roleController = JOLLY.controller.RoleController;


/**
 * Display user's roles.
 */
router.get('/', authService.verifyUserAuthentication, (req, res) => {

  roleController
    .getUserRoles(req.userId)
    .then((userRoleList) => {
      res.apiSuccess({
        roles: userRoleList
      });
    });
});

router.get('/user/:slug', (req, res, next) => {

  userController.getUserBySlug(req.params.slug)
    .then(userData => {
      return roleController.getUserRoles(userData.id);
    })
    .then((userRoleList) => {
      res.apiSuccess({
        roles: userRoleList
      });
    })
    .catch(next);
});

/**
 * create new role into system.
 */
router.post('/', authService.verifyUserAuthentication, (req, res) => {

	roleController
		.addRole(Object.assign({}, req.body, { user_id: req.userId }))
		.then((roleData) => {
			res.apiSuccess({
				role: roleData
			});
		});
});

router.put('/:id', authService.verifyUserAuthentication, (req, res) => {
	roleController
		.updateRole(req.params.id, req.body)
		.then((roleData) => {
			res.apiSuccess({
				role: roleData.toJson({}),
			});
		});
});

router.delete('/:id', authService.verifyUserAuthentication, (req, res) => {

	roleController
		.deleteRole(req.params.id)
		.then(() => {
			res.apiSuccess({});
		});
});

module.exports = router;
