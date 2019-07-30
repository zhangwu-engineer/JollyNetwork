/**
 * Unit Route Handler
 */
const router = require('express').Router();
const Promise = require('bluebird');
const asyncMiddleware = require('../lib/AsyncMiddleware');
const checkEmail = require('../lib/CheckEmail');
const IdentityAnalytics = require('../analytics/identity');
const buildContext = require('../analytics/helper/buildContext');
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
  const params = Object.assign({}, req.body, { fromUserId: req.userId, headers: buildContext(req) });
  const connectionData = await connectionController.addConnection(params);
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
  const headers = buildContext(req);
  const identityAnalytics = new IdentityAnalytics(JOLLY.config.SEGMENT.WRITE_KEY, headers);
  let connection = await connectionController.findConnectionById(req.params.id);
  const params = { status: ConnectionStatus.CONNECTED, connected_at: new Date() };

  if (checkEmail(connection.to)) {
    let user = await userController.findUserByEmail({email: connection.to});
    const userData = user.toJson({ isSafeOutput: true });
    params.to = userData.id.toString();
  }

  const options = { id: req.params.id, userId: req.userId, data: params, headers: headers };
  connection = await connectionController.updateConnection(options);
  connection = connection.toJson({});
  identityAnalytics.send(connection.to);
  identityAnalytics.send(connection.from);
  res.apiSuccess({ connection: connection });
}));

router.delete('/:id', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  const params = { id: req.params.id, userId: req.userId, headers: buildContext(req) };
  const result = await connectionController.deleteConnection(params);
	res.apiSuccess({});
}));

router.post('/:id/disconnect', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  const headers = buildContext(req);
  const identityAnalytics = new IdentityAnalytics(JOLLY.config.SEGMENT.WRITE_KEY, headers);
  const connections = await connectionController.findConnectionsBetweenUserIds([req.params.id, req.userId]);
  connections.forEach(async (connection) => {
    const params = {
      id: connection.id, userId: req.userId, headers: headers,
      data: { status: ConnectionStatus.DISCONNECTED, disconnected_At: new Date() }
    };
    await connectionController.updateConnection(params);
    identityAnalytics.send(connection.to);
    identityAnalytics.send(connection.from);
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
