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

		// create a token
		let authSecret = JOLLY.config.APP.AUTHENTICATION_SECRET,
			expiresIn = 864000 /** Expires in 240 hours */,
			userId = options.userId || '',
			accessToken = jwt.sign ({
				id: userId
			}, authSecret, {
				expiresIn: expiresIn
			});

		return accessToken;
	}

	/**
	 * Verify Authentication Access Token and sets current active user.
	 * @param {Object} req
	 * @param {Object} res
	 * @param {Function} next
	 *
	 * @public
	 */
	verifyUserAuthentication (req, res, next) {

		let authSecret = JOLLY.config.APP.AUTHENTICATION_SECRET,
			accessToken = req.headers['x-access-token'];

		if (!accessToken) {

			next (new ApiError('No access token provided.', 403));
		}

        jwt.verify(accessToken, authSecret, (err, decoded) => {
            if (err) {

                next (new ApiError(err.message || 'Failed to process authentication token.'));
            }
            else {

                req.userId = decoded.id;
                next();
            }
        });
	}

}

module.exports = Authentication;
