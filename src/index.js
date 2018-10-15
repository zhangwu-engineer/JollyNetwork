/**
 * Application Entry
 */

require('./namespaces');

const DefaultConfig = require('./config'),
	App = require('./App');

/** Load Config and initiate application */
DefaultConfig(() => {

	/**
	 * Initiate application server
	 */
	JOLLY.context = new App();

});
