/**
 * Authentication Controller
 */

const jwt = require('jsonwebtoken'),
  bcrypt = require('bcryptjs');

class Authentication {

  /**
   * Constructor method.
   * @param {Object} [options]
   * @returns {Authentication|*}
   */
  constructor (options) {

    if ( !Authentication.instance ) {

      Authentication.instance = this;
    }

    return Authentication.instance;
  }

  /**
   * Generate encrypted hashed password
   * @param {String} password - Plain password
   * @return {String}
   */
  generateHashedPassword (password) {

    return bcrypt.hashSync(password, 10);
  }

  /**
   * Verify/Compare password.
   * @param {String} plainPassword
   * @param {String} encryptedPassword
   * @returns {Boolean}
   */
  verifyPassword (plainPassword, encryptedPassword) {

    return bcrypt.compareSync(plainPassword, encryptedPassword);
  }

  /**
   * Generate Authentication Access Token.
   * @param {Object} options
   * @returns {String}
   */
  generateToken (options) {

    let params = { id: options.userId || '' };
    if (options.role) params.role = options.role;

    // create a token
    let authSecret = JOLLY.config.APP.AUTHENTICATION_SECRET,
      expiresIn = options.expiresIn || 86400, /** Expires in 86400 = 24 hours */
      accessToken = jwt.sign ( params
      , authSecret, {
        expiresIn: expiresIn
      });

    return accessToken;
  }

  generatePhoneVerificationToken () {

    const possible = "0123456789";
    let token = "";

    for (var i = 0; i < 5; i++) {
      token += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return token;
  }

  /**
   * Verify Authentication Access Token and sets current active user.
   * @param {Object} req
   * @param {Object} res
   * @param {Function} next
   *
   * @public
   */
  verifyUserAuthentication(req, res, next) {
    let authSecret = JOLLY.config.APP.AUTHENTICATION_SECRET,
      accessToken = req.headers['x-access-token'];

    if (!accessToken) {
      next(new ApiError('No access token provided.', 403));
    }

    jwt.verify(accessToken, authSecret, (err, decoded) => {
      if (err) {
        next(new ApiError(err.message || 'Failed to process authentication token.'));
      } else {
        req.userId = decoded.id;
        next();
      }
    });
  }

  /**
   * Verify Authentication Access Token and sets current active admin user.
   * @param {Object} req
   * @param {Object} res
   * @param {Function} next
   *
   * @public
   */
  verifyAdminAuthentication(req, res, next) {
    let authSecret = JOLLY.config.APP.AUTHENTICATION_SECRET,
      accessToken = req.headers['x-access-token'] || req.query.token;

    if (!accessToken) {
      next(new ApiError('No access token provided.', 403));
    }

    jwt.verify(accessToken, authSecret, (err, decoded) => {
      if (err) {
        next(new ApiError(err.message || 'Failed to process authentication token.'));
      } else {
        if(decoded.role === 'ADMIN'){
          req.userId = decoded.id;
          next();
        } else {
          next(new ApiError('unauthorized'));
        }
      }
    });
  }

  verifyUserEmail (req, res, next) {
    let authSecret = JOLLY.config.APP.AUTHENTICATION_SECRET,
      token = req.body.token;

    if (!token) {
      next (new ApiError('No token provided.', 403));
    }

    jwt.verify(token, authSecret, (err, decoded) => {
      if (err) {
        next (new ApiError('Invalid token.'));
      }
      else {
        req.userId = decoded.id;
        next();
      }
    });
  }

}

module.exports = Authentication;
