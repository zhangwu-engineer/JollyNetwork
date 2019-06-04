/**
 * Unit Route Handler
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const mongodb = require('mongodb');
const Promise = require('bluebird');
const asyncMiddleware = require('../lib/AsyncMiddleware');
const ConnectionStatus = require('../enum/ConnectionStatus');
const EntityConnection = require('../entities/EntityConnection');
let authService = JOLLY.service.Authentication,
  workController = JOLLY.controller.WorkController,
  userController = JOLLY.controller.UserController,
	connectionController = JOLLY.controller.ConnectionController;


/**
 * Display user's connections.
 */
router.get('/', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  const user = await userController.getUserById(req.userId);
  const connections = await connectionController.findConnections({ to: { $in: [new mongodb.ObjectId(req.userId), user.email] } });

  const populatedConnections = await Promise.map(connections, (connection) => {
    return new Promise((resolve, reject) => {
      userController
        .getUserById(connection.from)
        .then(user => {
          const populatedData = connection;
          populatedData.from = user;
          resolve(populatedData);
        })
        .catch(reject);
    });
  });

  res.apiSuccess({
    connections: populatedConnections
  });
}));

/**
 * create new endorsement into system.
 */
router.post('/', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {

  const connectionData = await connectionController.addConnection(Object.assign({}, req.body, { fromUserId: req.userId }));
  res.apiSuccess({
    connection: connectionData
  });

}));

router.put('/:id/accept', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
	const connection = await connectionController.updateConnection(req.params.id, req.userId, {
    status: ConnectionStatus.CONNECTED,
    connected_at: new Date(),
  });
  res.apiSuccess({
    connection: connection.toJson({}),
  });
}));

router.delete('/:id', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  const result = await connectionController.deleteConnection(req.params.id, req.userId)
	res.apiSuccess({});
}));

router.post('/check', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  const to = await userController.getUserBySlug(req.body.toSlug);
  const connection = await connectionController.checkConnection(to.id.toString(), req.body.from);
  res.apiSuccess({
    connection: connection ? connection.toJson({}) : null,
  });
}));

module.exports = router;
