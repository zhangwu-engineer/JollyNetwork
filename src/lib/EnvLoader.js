/**
 * Env Loader will load all files in directory it's initiated with and
 * assign the variables values or use the default value set.
 */


const path = require('path'),
	fs = require('fs');


class EnvLoader {

	/**
	 * Constructor
	 * @param {Object} options
	 * @param {String} options.envDirectory - Base directory to load env variables from.
	 * @param {Function} options.onLoad - Call back handler after config loaded.
	 * @param {Function} options.onComplete - Call back handler after config loaded completely.
	 */
	constructor(options) {

		options = options || {};

		let envDirectory = options.envDirectory || process.cwd();

		if (envDirectory === '') {
			throw new Error('Env base directory need to be assigned')
		}

		// Set properties.
		this.envDirectory = envDirectory;
		this._callBackOnLoad = options.onLoad || {};
		this._callBackOnComplete = options.onComplete || {};

		// Load env variables.
		this.load();
	}

	/**
	 * Load and parse env file.
	 */
	load() {

		let self = this,
			envDir = this.envDirectory,
			filePath = path.join(envDir, '.env'),
			envVars = [],
			keyValueArr,
			key,
			val,
			fileContent;

		if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {

			fileContent = fs.readFile(filePath, 'utf8', (err, content) => {

				fileContent = content.replace(/\r\n/g, '\r').replace(/\n/g, '\r');

				fileContent.split(/\r/).forEach((line) => {

					keyValueArr = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);

					if (keyValueArr != null) {

						key = keyValueArr[1].toUpperCase();
						val = keyValueArr[2] || '';

						envVars[key] = val
					}

				});

				self.envVariables = envVars;
				self._callBackOnLoad(self);
			});
    } else {
      self._callBackOnLoad(self);
    }
	}

	/**
	 * Done loading configuration vars
	 */
	done () {

		this._callBackOnComplete();
	}

	/**
	 * Get environment variable value
	 * @param {String} envKey  - Environment key to load.
	 * @param {String|Number|Boolean} defaultValue  - Default value to set if fail to load variable.
	 */
	get (envKey, defaultValue) {

		envKey = envKey.toUpperCase();

		let envVars = this.envVariables;

		return envVars[envKey] ? envVars[envKey] : defaultValue;
	}

}

module.exports = EnvLoader;
