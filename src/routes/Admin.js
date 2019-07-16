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
router.post('/user', authService.verifyAdminAuthentication, asyncMiddleware(async (req, res, next) => {

  const result = await userController.searchUsers(req.body);
  res.apiSuccess(result);

}));

router.get('/user/trusted/:userId', authService.verifyAdminAuthentication, asyncMiddleware(async (req, res, next) => {
  userController.setUserTrusted(req.params.userId)
    .then(userData => {
      res.apiSuccess(userData);
    }).catch(next);
}));

module.exports = router;
