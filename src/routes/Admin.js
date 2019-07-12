/**
 * User Route Handler
 */
const router = require('express').Router();
const json2csv = require('json2csv').parse;
// var stringify = require('csv-stringify');
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
router.post('/user', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {

  const result = await userController.searchUsers(req.body);
  res.apiSuccess(result);

}));

router.get('/user/trusted/:userId', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  userController.setUserTrusted(req.params.userId)
    .then(userData => {
      res.apiSuccess(userData);
    }).catch(next);
}));

router.get('/users/csv', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  try {
    const users = await userController.searchUsers({});
    const fields = ['email', 'firstName', 'lastName', 'city', 'connections','trusted', 'jobs',
      'topPosition','top2ndPosition','posts','coworkers','date_created'
    ];
    const csvData = json2csv(users.data, {fields});
    res.set('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=\"' + 'users-' + Date.now() + '.csv\"');
    res.send(csvData)
  } catch (err) {
    throw err
  }
}));

module.exports = router;
