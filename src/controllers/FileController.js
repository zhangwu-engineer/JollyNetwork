/**
 * File controller class, in charge of transactions related to user's files.
 */
const mongodb = require('mongodb');

const EntityFile = require('../entities/EntityFile'),
	DbNames = require('../enum/DbNames');


class FileController {

	/**
     * Controller constructor method.
	 * @returns {FileController|*}
	 */
	constructor () {

		if ( !FileController.instance ) {

			FileController.instance = this;
		}

		return FileController.instance;
	}

	/**
     * Returns default database.
	 * @returns {Db}
	 */
	getDefaultDB () {

		let Database = JOLLY.service.Db,
			databaseName = DbNames.DB;

		return Database.database(databaseName);
	}

	/**
	 * create new file.
	 * @param {Object} options
	 * @returns {Promise<Object>}
	 */
	addFile (options) {

		let self = this;

		return new Promise((resolve, reject) => {

			let {path, type, user_id} = options,
        newFile;

        newFile = new EntityFile({
        path,
        type,
        user_id,
			});

      self.saveFile(newFile)
        .then((fileData) => {
          resolve (fileData.toJson({}));
        })
        .catch(reject);
		});
	}

	listFiles(cb) {

		let Database = JOLLY.service.Db;

		Database.query(DbNames.DB, 'files', (userFileList) => {

			let itemList = [];

			if (userFileList) {

				userFileList.forEach((fileData) => {

					let fileObject = new EntityFile(fileData);

					itemList.push(fileObject.toJson({}));
				})

			}

			cb(itemList);
		});
  }

  getUserFiles(userId) {
    let db = this.getDefaultDB();
    return new Promise((resolve, reject) => {

      db
        .collection('files')
        .find({
          user_id: new mongodb.ObjectID(userId),
        })
        .toArray((err, result) => {
          if (err) reject(err);
          let itemList = [];

          if (result) {

            result.forEach((fileData) => {

              let fileObject = new EntityFile(fileData);

              itemList.push(fileObject.toJson({}));
            })

          }

          resolve (itemList);
        });
    });
  }

  findFileById (id) {

		let db = this.getDefaultDB(),
			file = null;
		return new Promise((resolve, reject) => {

			db.collection('files').findOne({
				_id: new mongodb.ObjectID(id),
			}).then((data) => {

				if (data) {

					file = new EntityFile(data);
				}

				resolve (file);

			}).catch(reject);

		});
	}
	/**
	 * Save file into database.
	 * @param {EntityFile} file - File entity we are going to register into system.
	 * @returns {Promise}
	 * @resolve {EntityFile}
	 */
	saveFile (file) {

		let db = this.getDefaultDB(),
			collectionName = 'files',
			fileData = file.toJson(),
			fileEntity;

		if (fileData.id == null) {
			delete (fileData.id);
		}

		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.insertOne(fileData)
				.then((result) => {
					//talentData.id = result.insertedId;
					fileEntity = new EntityFile(fileData);
					resolve(fileEntity);
				})
				.catch(reject);

			});
  }

  updateFile(id, data) {
    let db = this.getDefaultDB(),
      collectionName = 'files',
      file = null;;

		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.updateOne({_id: new mongodb.ObjectID(id)}, { $set: data })
				.then((result) => {
          return db.collection('files').findOne({
            _id: new mongodb.ObjectID(id),
          });
        })
        .then((data) => {

          if (data) {

            file = new EntityFile(data);
          }

          resolve (file);

        })
				.catch(reject);

			});
  }

  deleteFile(id) {
    let db = this.getDefaultDB(),
      collectionName = 'files';

		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.deleteOne({_id: new mongodb.ObjectID(id)})
				.then(() => {
          resolve();
        })
				.catch(reject);

			});
  }
}

module.exports = FileController;
