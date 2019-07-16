/**
 * Unit Route Handler
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const mongodb = require('mongodb');
const Promise = require('bluebird');
const asyncMiddleware = require('../lib/AsyncMiddleware');
const checkEmail = require('../lib/CheckEmail');
const ConnectionStatus = require('../enum/ConnectionStatus');
const EntityConnection = require('../entities/EntityConnection');
let authService = JOLLY.service.Authentication,
  workController = JOLLY.controller.WorkController,
  userController = JOLLY.controller.UserController,
  businessController = JOLLY.controller.BusinessController,
	connectionController = JOLLY.controller.ConnectionController;


/**
 * Display user's connections.
 */
router.get('/', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  const user = await userController.getUserById(req.userId);
  const connections = await connectionController.findConnections({ to: { $in: [req.userId, user.email] } });
  const populatedConnections = await Promise.map(connections, (connection) => {
    return new Promise((resolve, reject) => {
      if (connection.connectionType === 'b2f') {
        businessController
        .getBusinessById(connection.from)
        .then(business => {
          const populatedData = connection;
          populatedData.from = business;
          resolve(populatedData);
        })
        .catch(reject);
      } else if (connection.connectionType !== 'b2f' && connection.connectionType !== 'f2b') {
        userController
          .getUserById(connection.from)
          .then(user => {
            const populatedData = connection;
            populatedData.from = user;
            resolve(populatedData);
          })
          .catch(reject);
      } else {
        resolve({})
      }
    });
  });

  res.apiSuccess({
    connections: populatedConnections
  });
}));

router.get('/business', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  const connections = await connectionController.findConnections({ to: { $in: [req.query.businessId] } });
  
  const populatedConnections = await Promise.map(connections, (connection) => {
    return new Promise((resolve, reject) => {
      let connectionType = connection && connection.connectionType;

      if (connectionType === 'f2b') {
        userController
          .getUserById(connection.from)
          .then(user => {
            const populatedData = connection;
            populatedData.from = user;
            resolve(populatedData);
          })
          .catch(error => {
            resolve({})
          });
      } else {
        resolve({})
      }
    });
  });

  res.apiSuccess({
    connections: populatedConnections
  });
}));

/**
 * create new connection into system.
 */
router.post('/', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  const connectionData = await connectionController.addConnection(Object.assign({}, req.body, { fromUserId: req.userId }));
  res.apiSuccess({
    connection: connectionData
  });

}));

router.get('/:id/info', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  let to = null;
  if (req.query.type === 'f2b') {
    to = await businessController.getBusinessBySlug(req.params.id);
  } else {
    to = await userController.getUserBySlug(req.params.id);
  }
  const connection = await connectionController.findConnectionsBetweenUserIds([to.id.toString(), req.query.from]);
  res.apiSuccess({
    connections: connection ? connection : null,
  });
}));

router.put('/:id/accept', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  let connection = await connectionController.findConnectionById(req.params.id);
  const params = { status: ConnectionStatus.CONNECTED, connected_at: new Date() };

  if (checkEmail(connection.to)) {
    let user = await userController.findUserByEmail({email: connection.to});
    const userData = user.toJson({ isSafeOutput: true });
    params.to = userData.id.toString();
  }

  connection = await connectionController.updateConnection(req.params.id, req.userId, params);
  res.apiSuccess({ connection: connection.toJson({}) });
}));

router.delete('/:id', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  const result = await connectionController.deleteConnection(req.params.id, req.userId);
	res.apiSuccess({});
}));

router.post('/:id/disconnect', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  const connections = await connectionController.findConnectionsBetweenUserIds([req.params.id, req.userId]);
  connections.forEach(async (connection) => {
    await connectionController.updateConnection(connection.id, req.userId, {
      status: ConnectionStatus.DISCONNECTED, disconnected_At: new Date()
    });
  });
	res.apiSuccess({});
}));

router.get('/connected', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  let connections = null;
  if (req.query.connectionType === 'f2f') {
    connections = await userController.getUserConnections(
      req.userId,
      req.query.city,
      req.query.query,
      req.query.role,
      req.query.connection
    );
  } else if (req.query.connectionType === 'b2f') {
    connections = await businessController.getBusinessConnections(
      req.userId,
      req.query.city,
      req.query.query,
      req.query.role,
      req.query.connection
    );
  }
  res.apiSuccess({
    connections,
  });
}));

module.exports = router;
