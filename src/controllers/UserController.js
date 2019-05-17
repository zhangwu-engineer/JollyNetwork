/**
 * User controller class, in charge of transactions related to users and their profiles.
 */
const mongodb = require('mongodb');
const AWS = require('aws-sdk');
const fileType = require('file-type');
const Promise = require('bluebird');
const Analytics = require('analytics-node');
const checkEmail = require('../lib/CheckEmail');
const ConnectionStatus = require('../enum/ConnectionStatus');
const EntityUser = require('../entities/EntityUser'),
  EntityProfile = require('../entities/EntityProfile'),
  EntityWork = require('../entities/EntityWork'),
  EntityRole = require('../entities/EntityRole'),
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

    let {email, firstName, lastName, password, avatar, invite} = options,
				encryptedPassword = password ? authService.generateHashedPassword(password) : '',
        newUser,
        newUserProfile;

      email = email.toLowerCase();
			firstName = firstName.toLowerCase();
      lastName = lastName.toLowerCase();
    const source = invite ? 'v-jobtag' : '';

    try {
      const isExistingEmail = await self.isExistingEmail(options.email);
      if (isExistingEmail) {
        throw new ApiError('email exists');
      } else {
        const slug = await self.generateSlug({ firstName, lastName});
        newUser = new EntityUser(encryptedPassword ? {
					email,
					firstName,
					lastName,
					password: encryptedPassword,
          slug,
          source,
				} : {
					email,
					firstName,
					lastName,
          slug,
          source,
        });
        const userData = await self.saveUser(newUser);
        const newProfileData = { userId: userData._id };
        if (avatar) {
          newProfileData.avatar = avatar;
        }
        newUserProfile = new EntityProfile(newProfileData);
        const userProfileData = await self.saveUserProfile(newUserProfile)
        const res = userData.toJson({ isSafeOutput: true });
        res.profile = userProfileData.toJson();
        if (invite) {
          await self.acceptInvite(invite, res);
        }
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

  async getUserByEmail(email) {
    let self = this,
      user = null,
      profile = null;

    try {
      user = await self.findUserByEmail({ email });
      if (user) {
        const userData = user.toJson({ isSafeOutput: true });
        profile = await self.getUserProfile(userData.id.toString());
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

  async getUserBadges(userSlug) {
    try {
      const db = this.getDefaultDB();
      const user = await this.getUserBySlug(userSlug);
      const userProfile = user.profile;

      const userRoles = await db.collection('roles').find({ user_id: new mongodb.ObjectID(user.id.toString()) }).toArray();
      const cityFreelancer = {
        name: 'city_freelancer',
        earned: userProfile.location && userRoles.length > 0 ? true : false,
        actions: [
          {
            name: 'Set your city',
            completed: !!userProfile.location,
          },
          {
            name: 'Add at least 1 Position for hire',
            completed: userRoles.length > 0,
          }
        ],
      };

      const userJobCountWithin60Days = await db.collection('works').countDocuments({
        user: new mongodb.ObjectID(user.id.toString()),
        date_created: { $gt:new Date(Date.now() - 24*60*60*1000*60) }
      });
      const activeFreelancer = {
        name: 'active_freelancer',
        earned: userJobCountWithin60Days > 0 ? true : false,
        actions: [
          {
            name: 'Add a past job to your profile',
            completed: userJobCountWithin60Days > 0,
          }
        ],
      };

      const setContactOptions = userProfile.receiveEmail || userProfile.receiveSMS || userProfile.receiveCall;
      const readyAndWilling = {
        name: 'ready_and_willing',
        earned: userProfile.avatar && userProfile.bio && userProfile.resume && userProfile.verifiedPhone && setContactOptions ? true : false,
        actions: [
          {
            name: 'Add a profile picture headshot',
            completed: !!userProfile.avatar,
          },
          {
            name: 'Fill out your bio',
            completed: !!userProfile.bio,
          },
          {
            name: 'Upload your resume',
            completed: !!userProfile.resume,
          },
          {
            name: 'Connect your phone number',
            completed: userProfile.verifiedPhone,
          },
          {
            name: 'Set your contact options',
            completed: setContactOptions,
          },
        ],
      };
      const sentConnectionRequestCount = await db.collection('connections').countDocuments({
        from: user.id.toString(),
      });
      const acceptedInvitationCount = await db.collection('connections').countDocuments({
        to: user.id.toString(),
        status: ConnectionStatus.CONNECTED,
      });
      const jobWithCoworkerCount = await db.collection('works').countDocuments({
        user: new mongodb.ObjectID(user.id.toString()),
        coworkers: { $exists: true, $not: { $size: 0 } },
      });
      const connected = {
        name: 'connected',
        earned: false,
        actions: [
          {
            name: 'Connect with a Coworker',
            completed: sentConnectionRequestCount > 0 ? true : false,
          },
          {
            name: 'Accept an invitation',
            completed: acceptedInvitationCount > 0 ? true : false,
          },
          {
            name: 'Add a coworker to a job',
            completed: jobWithCoworkerCount > 0 ? true : false,
          },
          {
            name: 'Verify a coworker did a job',
            completed: false,
          },
          {
            name: 'Get Verified on a job by another coworker',
            completed: false,
          },
          {
            name: 'Get 10 total Coworker Connections',
            completed: false,
          },
        ],
      };

      return [cityFreelancer, activeFreelancer, readyAndWilling, connected];
    } catch (err) {
      throw new ApiError(err.message);
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

  async uploadResume(userId, resume) {
    AWS.config.update({ accessKeyId: JOLLY.config.AWS.ACCESS_KEY_ID, secretAccessKey: JOLLY.config.AWS.SECRET_ACCESS_KEY });
    const S3 = new AWS.S3();
    try {
      const fileBuffer = Buffer.from(resume, 'base64');
      const fileTypeInfo = fileType(fileBuffer);

      const filePath = `${userId}.${fileTypeInfo.ext}`;
      const params = {
        Bucket: JOLLY.config.S3.RESUME_BUCKET,
        Key: filePath,
        Body: fileBuffer,
        ACL: 'public-read',
        ContentEncoding: 'base64',
        ContentType: fileTypeInfo.mime,
      };
      await S3.putObject(params).promise();
      await this.updateUserProfile(
        userId,
        {
          resume: `${JOLLY.config.S3.RESUME_BUCKET_LINK}/${filePath}`,
        }
      );

      return `${JOLLY.config.S3.RESUME_BUCKET_LINK}/${filePath}`;
    } catch (err) {
      throw new ApiError(err.message);
    }
  }

  async deleteResume(userId) {
    AWS.config.update({ accessKeyId: JOLLY.config.AWS.ACCESS_KEY_ID, secretAccessKey: JOLLY.config.AWS.SECRET_ACCESS_KEY });
    const db = this.getDefaultDB();
    const S3 = new AWS.S3();
    try {
      const filePath = `${userId}.pdf`;
      const params = {
        Bucket: JOLLY.config.S3.RESUME_BUCKET,
        Key: filePath,
      };
      await S3.deleteObject(params).promise();
      await db
        .collection('profiles')
        .updateOne(
          { userId: new mongodb.ObjectID(userId) },
          {
            $unset: {
              resume: '',
            },
          }
        );
      return true;
    } catch (err) {
      throw new ApiError(err.message);
    }
  }

  async findUserByKeyword (options) {

		let db = this.getDefaultDB(),
      keyword = options.keyword.trim(),
      userId = options.user_id,
      user = null;

    try {
      const result1 = await db.collection('users').find({
        slug: { $regex: new RegExp(`^${keyword.split(' ').join('-')}`, "i") },
        _id: { $ne: new mongodb.ObjectID(userId) },
      }).toArray();
      const result2 = await db.collection('users').find({
        email: { $regex: new RegExp(`^${keyword.split(' ').join('-')}`, "i") },
        _id: { $ne: new mongodb.ObjectID(userId) },
      }).toArray();
      const userList1 = result1.sort((a,b) => (a.slug > b.slug) ? 1 : ((b.slug > a.slug) ? -1 : 0));
      const userList2 = result2.sort((a,b) => (a.slug > b.slug) ? 1 : ((b.slug > a.slug) ? -1 : 0));
      const userIds = [];
      userList1.forEach((userData) => {
        if (!userIds.includes(userData._id.toString())) {
          userIds.push(userData._id.toString());
        }
      });
      userList2.forEach((userData) => {
        if (!userIds.includes(userData._id.toString())) {
          userIds.push(userData._id.toString());
        }
      });
      return userIds;
    } catch (err) {
      throw err;
    }
  }

  async searchUsers(options) {
    try {
      const { email, firstName, lastName, sort, page, perPage } = options;
      const db = this.getDefaultDB();
      const skip = page && perPage ? (page - 1) * perPage : 0;
      const aggregates = [];
      const match = {};
      if (email) {
        match.email = { $regex: new RegExp(`^${email}`, "i") };
      }
      if (firstName) {
        match.firstName = { $regex: new RegExp(`^${firstName}`, "i") };
      }
      if (lastName) {
        match.lastName = { $regex: new RegExp(`^${lastName}`, "i") };
      }
      if (match.email || match.firstName || match.lastName) {
        aggregates.push({
          $match: match,
        });
      }
      if (sort) {
        aggregates.push({
          $sort: sort,
        });
      } else {
        aggregates.push({
          $sort: { date_created: -1 },
        });
      }
      if (page && perPage) {
        aggregates.push({
          $skip: skip,
        });
        aggregates.push({
          $limit: perPage,
        });
      }
      let users = await db.collection('users').aggregate(aggregates).toArray();
      const count = await db.collection('users').countDocuments(match);
      const pages = perPage ? Math.ceil(count/perPage) : 1;
      users = await Promise.map(users, async user => {
        const works = await db.collection('works').find({ user: user._id }).toArray();
        const posts = await db.collection('posts').find({ user: user._id }).toArray();
        const coworkers = await this.getUserCoworkers(user._id.toString());
        const roleCounts = works.map(w => w.role).reduce((p, c) => {
          const newP = p;
          if (!newP[c]) {
            newP[c] = 0;
          }
          newP[c] += 1;
          return newP;
        }, {});
        var sortable = [];
        for (var role in roleCounts) {
            sortable.push([role, roleCounts[role]]);
        }

        sortable.sort(function(a, b) {
            return b[1] - a[1];
        });
        const topPosition = sortable[0] ? sortable[0][0] : '';
        const top2ndPosition = sortable[1] ? sortable[1][0] : '';
        return {
          ...user,
          jobs: works.length,
          posts: posts.length,
          coworkers: coworkers.length,
          topPosition,
          top2ndPosition,
        }
      });
      return {
        data: users,
        page: page || 1,
        pages,
      };
    } catch (err) {
      throw new ApiError(err.message);
    }
  }
  async searchCityUsers(city, query, page, perPage, userId) {
    const db = this.getDefaultDB();
    const skip = page && perPage ? (page - 1) * perPage : 0;
    const aggregates = [
      {
        $match : {
          location : city,
          userId: { $ne: new mongodb.ObjectID(userId) },
        }
      },
      { $sort  : { userId : -1 } },
    ];
    if (query) {
      aggregates.push({
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      });
      aggregates.push({
        $unwind: "$user"
      });
      aggregates.push({
        $match : {
          'user.slug': { $regex: new RegExp(`^${query.split(' ').join('-')}`, "i") },
        }
      });
    }
    if (page && perPage) {
      aggregates.push({
        $facet : {
          meta: [ { $count: "total" }, { $addFields: { page: parseInt(page, 10) } } ],
          data: [ { $skip:  skip}, { $limit:  perPage } ]
        }
      })
    } else {
      aggregates.push({
        $facet : {
          meta: [ { $count: "total" }, { $addFields: { page: parseInt(page, 10) } } ],
          data: [ { $skip:  skip} ]
        }
      })
    }
    try {
      const data = await db.collection('profiles').aggregate(aggregates).toArray();
      const profiles = data[0].data;
      const users = await Promise.map(profiles, profile => this.getUserById(profile.userId));
      return {
        total: data[0].meta[0] ? data[0].meta[0].total : 0,
        page: data[0].meta[0] && data[0].meta[0].page ? data[0].meta[0].page : 1,
        users,
      };
    } catch (err) {
      throw new ApiError(err.message);
    }
  }

  async getUserCoworkers(userId) {
    try {
      const connectionController = JOLLY.controller.ConnectionController;
      const workController = JOLLY.controller.WorkController;
      const user = await this.getUserById(userId);
      const connections1 = await connectionController
        .findConnections({ to: { $in: [userId, user.email] }, status: ConnectionStatus.CONNECTED});
      const coworkersFromConnection1 = connections1.map(connection => connection.from);
      const connections2 = await connectionController
        .findConnections({ from: userId, status: ConnectionStatus.CONNECTED});
      const coworkersFromConnection2 = connections2.map(connection => connection.to);
      const connectionCoworkerIds = coworkersFromConnection1.concat(coworkersFromConnection2);

      const works = await workController.getUserWorks(userId);
      const workSlugs = works.map(work => work.slug);
      const allWorks = await workController.getWorksBySlugs(workSlugs, userId);
      const workCoworkerIds = allWorks.map(work => work.user.toString());

      const coworkerIds = connectionCoworkerIds.concat(workCoworkerIds).filter((v, i, arr) => arr.indexOf(v) === i);

      const coworkers = await Promise.map(coworkerIds, coworkerId =>
        checkEmail(coworkerId)
          ? this.getUserByEmail(coworkerId)
          : this.getUserById(coworkerId)
        );
      return coworkers;
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

  saveWork (work) {

		let db = this.getDefaultDB(),
			collectionName = 'works',
			workData = work,
			workEntity;

		if (workData.id == null) {
			delete (workData.id);
		}

		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.insertOne(workData)
				.then((result) => {
					//talentData.id = result.insertedId;
					workEntity = new EntityWork(workData);
					resolve(workEntity);
				})
				.catch(reject);

			});
  }

  addCoworker(workId, userId, userEmail) {
    let db = this.getDefaultDB();

		return new Promise((resolve, reject) => {

      db.collection('works')
        .updateOne({
          _id: new mongodb.ObjectID(workId),
        }, { $addToSet: { coworkers: userId } })
        .then(() => {
          return db.collection('works')
            .updateOne({
              _id: new mongodb.ObjectID(workId),
            }, { $pull: { coworkers: userEmail } })
        })
        .then(() => {
          resolve();
        })
        .catch(reject);

    });
  }

  clearEmail(workSlug, email) {
    let db = this.getDefaultDB();

		return new Promise((resolve, reject) => {

      db.collection('works')
        .updateOne({
          slug: workSlug,
          coworkers: email,
        }, { $pull: { coworkers: email } })
        .then(() => {
          resolve();
        })
        .catch(reject);

    });
  }

  deleteToken(token) {
    let db = this.getDefaultDB(),
      collectionName = 'tokens';

		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.deleteOne({ token })
				.then(() => {
          resolve();
        })
				.catch(reject);

			});
  }

  async acceptInvite(invite, user) {
    const analytics = new Analytics(JOLLY.config.SEGMENT.WRITE_KEY);
    const self = this;
    try {
      const workData = invite.work;
      const originalAddMethod = workData.addMethod;
      workData.user = user.id;
      workData.addMethod = 'tagged';
      const newWork = await self.saveWork(workData);
      const newWorkData = newWork.toJson({});
      const newRole = await self.saveRole(workData.role, user);
      if (workData.verifiers) {
        analytics.track({
          userId: user.id.toString(),
          event: 'Coworker Tagged on Job',
          properties: {
            userID: invite.tagger && invite.tagger.userId,
            jobID: workData.id,
            eventID: workData.slug,
            jobAddedMethod: workData.addMethod || 'created',
            taggedCoworker: {
              userID: user.id.toString(),
              email: user.email,
              name: `${user.firstName} ${user.lastName}`
            },
            tagStatus: 'accepted',
          }
        });
        analytics.track({
          userId: invite.tagger && invite.tagger.userId,
          event: 'Coworker Job Verified',
          properties: {
            userID: invite.tagger && invite.tagger.userId,
            jobID: workData.id,
            eventID: workData.slug,
            jobAddedMethod: originalAddMethod,
            verificationMethod: 'tagged',
            verifiedCoworkerUserID: user.id.toString(),
          }
        });
      }
      analytics.track({
        userId: user.id.toString(),
        event: 'Coworker Tag on Job Accepted',
        properties: {
          userID: user.id.toString(),
          jobID: workData.id,
          eventID: workData.slug,
          taggingUserID: invite.tagger && invite.tagger.userId,
        }
      });

      analytics.track({
        userId: user.id.toString(),
        event: 'Job Added',
        properties: {
          userID: user.id.toString(),
          userFullname: `${user.firstName} ${user.lastName}`,
          userEmail: user.email,
          jobID: newWorkData.id,
          eventID: newWorkData.slug,
          role: newWorkData.role,
          beginDate: newWorkData.from,
          endDate: newWorkData.to,
          jobCreatedTimestamp: newWorkData.date_created,
          caption: newWorkData.caption,
          numberOfImages: newWorkData.photos.length,
          jobAddedMethod: 'tagged',
          isEventCreator: false,
        }
      });

      if (newRole) {
        analytics.track({
          userId: user.id.toString(),
          event: 'Role Added',
          properties: {
            userID: user.id.toString(),
            userFullname: `${user.firstName} ${user.lastName}`,
            userEmail: user.email,
            roleName: newRole.name,
            roleRateLow: newRole.minRate,
            roleRateHigh: newRole.maxRate,
            years: newRole.years,
            throughJob: true,
            jobID: newWorkData.id,
            eventID: newWorkData.slug,
          }
        });
      }

      await self.clearEmail(workData.slug, user.email);
      if (invite.rootWorkId) {
        await self.addCoworker(invite.rootWorkId, user.id.toString(), user.email);
      }
      if (invite.token) {
        await self.deleteToken(invite.token);
      }
      return workData;
    } catch (err) {
      throw err;
    }
  }

  saveRole (role, user) {
		let db = this.getDefaultDB(),
      collectionName = 'roles',
      roleData = null;

		return new Promise((resolve, reject) => {

      db.collection(collectionName)
        .findOne({ name: role, user_id: new mongodb.ObjectID(user.id.toString())})
        .then((data) => {
          if (data) {
            resolve();
          } else {
            const newRole = new EntityRole({
              name: role,
              user_id: user.id.toString(),
              minRate: '',
              maxRate: '',
              unit: 'hour',
              years: '',
            });
            roleData = newRole.toJson();
            if (roleData.id == null) {
              delete (roleData.id);
            }
            return db.collection(collectionName).insertOne(roleData);
          }
        })
        .then(() => {
          const roleEntity = new EntityRole(roleData);
          resolve(roleEntity.toJson({}));
        })
				.catch(reject);

			});
  }
}

module.exports = UserController;
