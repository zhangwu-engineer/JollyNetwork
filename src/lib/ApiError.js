/**
 * Api Error Handler Class
 */
class ApiError extends Error {

    /**
     * Initiate class method.
     * @param {String} message
     * @param {Number} [code]
     */
    constructor(message, code = 400) {

        super(message);

        //Error.captureStackTrace(this, this.constructor);

        this.name = this.constructor.name;
        this.message = message;
        this.code = code;
    }
}

module.exports = ApiError;