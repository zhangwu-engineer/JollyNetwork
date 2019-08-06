const buildContext = (req) => {
  return {
    user_agent: req.headers['user-agent'],
    clientId: req.headers['client-id'],
    ip: req.ip,
  }
};

module.exports = buildContext;
