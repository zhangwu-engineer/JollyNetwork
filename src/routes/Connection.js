/**
 * Unit Route Handler
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const mongodb = require('mongodb');
const Promise = require('bluebird');
const asyncMiddleware = require('../lib/AsyncMiddleware');
ConnectionStatus = require('../enum/ConnectionStatus');
let authService = JOLLY.service.Authentication,
  workController = JOLLY.controller.WorkController,
  userController = JOLLY.controller.UserController,
	connectionController = JOLLY.controller.ConnectionController;


/**
 * Display user's connections.
 */
router.get('/', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  const user = await userController.getUserById(req.userId);
  const connections = await connectionController.findConnections({ to: { $in: [req.userId, user.email] } });

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

  const connectionData = await connectionController.addConnection(Object.assign({}, req.body, { from: req.userId }));
  res.apiSuccess({
    connection: connectionData
  });

}));

router.put('/:id/accept', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
	const connection = await connectionController.updateConnection(req.params.id, {
    status: ConnectionStatus.CONNECTED,
    connected_at: new Date(),
  });
  res.apiSuccess({
    connection: connection.toJson({}),
  });
}));

router.delete('/:id', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  const result = await connectionController.deleteConnection(req.params.id)
	res.apiSuccess({});
}));

module.exports = router;
