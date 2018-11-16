/**
 * User controller class, in charge of transactions related to users and their profiles.
 */
const mongodb = require('mongodb');
const AWS = require('aws-sdk');
const fileType = require('file-type');

const EntityUser = require('../entities/EntityUser'),
  EntityProfile = require('../entities/EntityProfile'),
  DbNames = require('../enum/DbNames');

class UserController {

	/**
     * Controller constructor method.
	 * @returns {UserController|*}
	 */
	constructor () {

		if ( !UserController.instance ) {

			UserController.instance = this;
		}

		return UserController.instance;
	}

	/**
     * Returns default database related to user's account.
	 * @returns {Db}
	 */
	getDefaultDB () {

		let Database = JOLLY.service.Db,
			databaseName = DbNames.DB;

		return Database.database(databaseName);
	}

	/**
	 * Register user into system.
	 * @param {Object} options
	 * @returns {Promise<Object>}
	 */
	async registerUser (options) {

		let self = this,
      authService = JOLLY.service.Authentication,
      mailService = JOLLY.service.Mail;

    let {email, firstName, lastName, password} = options,
				encryptedPassword = password ? authService.generateHashedPassword(password) : '',
        newUser,
        newUserProfile;

			firstName = firstName.toLowerCase();
      lastName = lastName.toLowerCase();

    try {
      const isExistingEmail = await self.isExistingEmail(options.email);
      if (isExistingEmail) {
        throw new ApiError('Email already exists!');
      } else {
        const slug = await self.generateSlug({ firstName, lastName});
        newUser = new EntityUser(encryptedPassword ? {
					email,
					firstName,
					lastName,
					password: encryptedPassword,
					slug,
				} : {
					email,
					firstName,
					lastName,
					slug,
        });
        const userData = await self.saveUser(newUser);
        newUserProfile = new EntityProfile({ userId: userData._id });
        const userProfileData = await self.saveUserProfile(newUserProfile)
        const res = userData.toJson({ isSafeOutput: true });
        res.profile = userProfileData.toJson();
        mailService.sendEmailVerification(res);
        return res;
      }
    } catch (err) {
      throw err;
    }
	}

  async getUserById(userId) {
    let self = this,
      user = null,
      profile = null;

    try {
      user = await self.findUserById(userId);
      if (user) {
        profile = await self.getUserProfile(userId);
        const userData = user.toJson({ isSafeOutput: true });
        userData.profile = profile.toJson();
        return userData;
      }
      throw new ApiError('User not found');
    } catch (err) {
      throw err;
    }
  }

  async getUserBySlug(slug) {
    let self = this,
      user = null,
      profile = null;

    try {
      user = await self.findUserBySlug(slug);
      if (user) {
        profile = await self.getUserProfile(user.getId());
        const userData = user.toJson({ isSafeOutput: true });
        userData.profile = profile.toJson();
        return userData;
      }
      throw new ApiError('User not found');
    } catch (err) {
      throw err;
    }
  }

  async updateUser(userId, data) {
    let self = this,
      currentUser = null,
      user = null,
      profile = null;

    try {
      currentUser = await self.findUserById(userId);
      const currentUserData = currentUser.toJson({ isSafeOutput: true });
      const { email, firstName, lastName } = data;
      if (email || firstName || lastName) {
        const data = {};
        if (email && currentUserData.email !== email) {
          data.email = email;
        }
        if (firstName && currentUserData.firstName !== firstName.toLowerCase()) {
          data.firstName = firstName.toLowerCase();
        }
        if (lastName && currentUserData.lastName !== lastName.toLowerCase()) {
          data.lastName = lastName.toLowerCase();
        }
        if (data.firstName || data.lastName) {
          const slug = await self.generateSlug({
            firstName: data.firstName || currentUserData.firstName,
            lastName: data.lastName || currentUserData.lastName,
          });
          data.slug = slug;
        }
        user = await self.updateUserCollection(userId, data);
      } else {
        user = currentUser;
      }
      if (user) {
        const userData = user.toJson({ isSafeOutput: true });
        if (data.profile) {
          const updatedProfile = await self.updateUserProfile(userId, data.profile);
          userData.profile = updatedProfile.toJson();
        }
        return userData;
      }
      throw new ApiError('Wrong user id');
    } catch (err) {
      throw err;
    }
  }

  async verifyUserEmail(userId) {
    let self = this,
      user = null,
      profile = null;

    try {
      user = await self.updateUserCollection(userId, { verifiedEmail: true });
      if (user) {
        const userData = user.toJson({ isSafeOutput: true });
        return userData;
      }
      throw new ApiError('Wrong user id');
    } catch (err) {
      throw err;
    }
  }

  async verifyUserPhone(userId, data) {
    let self = this;

    try {
      const userData = await self.updateUser(userId, { profile: { phone: data.phone, verifiedPhone: false }});
      return userData;
    } catch (err) {
      throw err;
    }
  }

  async updateUserPassword(options) {
    let self = this,
      user = null,
      profile = null;

    try {
      const encryptedPassword = options.password ? authService.generateHashedPassword(options.password) : '',
      user = await self.updateUserCollection(options.userId, { password: encryptedPassword });
      if (user) {
        const userData = user.toJson({ isSafeOutput: true });
        return userData;
      }
      throw new ApiError('Wrong user id');
    } catch (err) {
      throw err;
    }
  }

  async uploadImage(userId, image) {
    AWS.config.update({ accessKeyId: JOLLY.config.AWS.ACCESS_KEY_ID, secretAccessKey: JOLLY.config.AWS.SECRET_ACCESS_KEY });
    const S3 = new AWS.S3();
    try {
      const fileBuffer = Buffer.from(image, 'base64');
      const fileTypeInfo = fileType(fileBuffer);
      const fileName = Math.floor(new Date() / 1000);

      const filePath = `${fileName}.${fileTypeInfo.ext}`;
      const params = {
        Bucket: JOLLY.config.S3.BUCKET,
        Key: filePath,
        Body: fileBuffer,
        ACL: 'public-read',
        ContentEncoding: 'base64',
        ContentType: fileTypeInfo.mime,
      };
      await S3.putObject(params).promise();

      return `${JOLLY.config.S3.BUCKET_LINK}/${filePath}`;
    } catch (err) {
      throw new ApiError(err.message);
    }
  }

	findUserByUsername (options) {

		let db = this.getDefaultDB(),
			username = options.username,
			user = null;

		return new Promise((resolve, reject) => {

			db.collection('users').findOne({
				username
			}).then((data) => {

				if (data) {

					user = new EntityUser(data);
				}

				resolve (user);

			}).catch(reject);

		});
	}

	findUserByEmail (options) {

		let db = this.getDefaultDB(),
			email = options.email,
			user = null;

		return new Promise((resolve, reject) => {

			db.collection('users').findOne({
				email
			}).then((data) => {

				if (data) {

					user = new EntityUser(data);
				}

				resolve (user);

			}).catch(reject);

		});
	}

	findUserById (id) {

		let db = this.getDefaultDB(),
			user = null;
		return new Promise((resolve, reject) => {

			db.collection('users').findOne({
				_id: new mongodb.ObjectID(id),
			}).then((data) => {

				if (data) {

					user = new EntityUser(data);
				}

				resolve (user);

			}).catch(reject);

		});
  }

  findUserBySlug (slug) {

		let db = this.getDefaultDB(),
			user = null;
		return new Promise((resolve, reject) => {

			db.collection('users').findOne({
			  slug,
			}).then((data) => {

				if (data) {

					user = new EntityUser(data);
				}

				resolve (user);

			}).catch(reject);

		});
  }

  getUserProfile (userId) {

		let db = this.getDefaultDB(),
			profile = null;
		return new Promise((resolve, reject) => {

			db.collection('profiles').findOne({
				userId: new mongodb.ObjectID(userId),
			}).then((data) => {

				if (data) {

					profile = new EntityProfile(data);
				}

				resolve (profile);

			}).catch(reject);

		});
	}

	listUsers(cb) {

		let Database = JOLLY.service.Db;

		Database.query(DbNames.DB, 'users', (userList) => {

			let itemList = [];

			if (userList) {

				userList.forEach((userData) => {

					let userObject = new EntityUser(userData);

					itemList.push(userObject.toJson({isSafeOutput: true}));
				})

			}

			cb(itemList);
		});
	}

	generateSlug(options) {
		return new Promise((resolve, reject) => {
			let db = this.getDefaultDB();
			db.collection('users').countDocuments(options).then(count => {
				const slug = count === 0
					? `${options.firstName}-${options.lastName.split(' ').join('-')}`
					: `${options.firstName}-${options.lastName.split(' ').join('-')}-${count}`;
				resolve(slug);
			})
			.catch(reject);
		});
	}

  isExistingEmail (email) {
    return new Promise((resolve, reject) => {
			let db = this.getDefaultDB();
			db.collection('users').countDocuments({ email }).then(count => {
				resolve(count);
			})
      .catch(reject);
		});
  }
	/**
	 * Save user into database.
	 * @param {EntityUser} user - User entity we are going to register into system.
	 * @returns {Promise}
	 * @resolve {EntityUser}
	 */
	saveUser (user) {

		let db = this.getDefaultDB(),
			collectionName = 'users',
			userData = user.toJson(),
			userEntity;

		if (userData.id == null) {
			delete (userData.id);
		}

		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.insertOne(userData)
				.then((result) => {
					//userData.id = result.insertedId;
					userEntity = new EntityUser(userData);
					resolve(userEntity);
				})
				.catch(reject);

			});
	}

  updateUserCollection(userId, data) {
    let db = this.getDefaultDB(),
      collectionName = 'users',
      user = null;

		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.updateOne({ _id: new mongodb.ObjectID(userId) }, { $set: data })
				.then(() => {
					return db.collection(collectionName).findOne({
            _id: new mongodb.ObjectID(userId),
          });
        })
        .then((data) => {

          if (data) {

            user = new EntityUser(data);
          }

          resolve (user);

        })
				.catch(reject);

			});
  }

  /**
	 * Save user profile into database.
	 * @param {EntityProfile} profile - User profile entity we are going to save into system.
	 * @returns {Promise}
	 * @resolve {EntityProfile}
	 */
	saveUserProfile (profile) {

		let db = this.getDefaultDB(),
			collectionName = 'profiles',
			profileData = profile.toJson(),
			profileEntity;

    const fieldNames = ['id', 'name', 'phone', 'bio', 'location', 'distance', 'facebook', 'twitter', 'linkedin', 'youtube'];

    fieldNames.forEach(field => {
      if (profileData[field] == null) {
        delete (profileData[field]);
      }
    })
		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.insertOne(profileData)
				.then((result) => {
          //userData.id = result.insertedId;
          profileEntity = new EntityProfile(profileData);

					resolve(profileEntity);
				})
				.catch(reject);

			});
  }

  updateUserProfile(userId, data) {
    let db = this.getDefaultDB(),
      collectionName = 'profiles',
      profile = null;

		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.updateOne({ userId: new mongodb.ObjectID(userId) }, { $set: data })
				.then(() => {
					return db.collection(collectionName).findOne({
            userId: new mongodb.ObjectID(userId),
          });
        })
        .then((data) => {

          if (data) {

            profile = new EntityProfile(data);
          }

          resolve (profile);

        })
				.catch(reject);

			});
  }
}

module.exports = UserController;
