
class Service {

    /**
     * Constructor method.
     * @param [options]
     * @returns {*}
     */
    constructor (options) {

        let serviceList = JOLLY.service,
            className = this.constructor.name,
            serviceInstance;

        if (className in serviceList) {

            serviceInstance = serviceList[className];
        }
        else {

            serviceInstance = this;
            serviceList[className] = serviceInstance;

            // Call constructor method on service class if it had one.
            if (serviceInstance._constructor) {

                serviceInstance._constructor(options);
            }
        }

        console.log( className );
        return serviceInstance;
    }

    /**
     * Service class default constructor.
     * @param [options]
     * @protected
     */
    _constructor (options) {

        // Should be implemented in inherited class.
    }

}

module.exports = Service;