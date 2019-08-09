const path = (url) => {
  const obj = new URL(url);
  return obj.pathname;
};

const buildContext = (req) => {
  if(!req.hasOwnProperty("headers")) return {};
  return {
    user_agent: req.headers['user-agent'],
    clientId: req.headers['client-id'],
    ip: req.ip,
    page: {
      url: req.headers['url-referer'],
      path: path(req.headers['url-referer']),
    }
  }
};

module.exports = buildContext;
