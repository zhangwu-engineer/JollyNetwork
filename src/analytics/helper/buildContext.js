const buildContext = (req) => {
  return {
    user_agent: req.headers['user-agent'],
    clientId: req.headers.clientID,
    ip: req.ip,
  }
};

module.exports = buildContext;
