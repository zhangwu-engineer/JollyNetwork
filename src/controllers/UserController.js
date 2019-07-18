/**
 * User controller class, in charge of transactions related to users and their profiles.
 */
const mongodb = require('mongodb');
const AWS = require('aws-sdk');
const fileType = require('file-type');
const Promise = require('bluebird');
const  ApiError = require('../lib/ApiError');
const Analytics = require('analytics-node');
const async = require("async");
const checkEmail = require('../lib/CheckEmail');
const IdentityAnalytics = require('../analytics/identity');
const ConnectionStatus = require('../enum/ConnectionStatus');
const EntityUser = require('../entities/EntityUser'),
  EntityProfile = require('../entities/EntityProfile'),
  EntityBusiness = require('../entities/EntityBusiness'),
  EntityWork = require('../entities/EntityWork'),
  EntityRole = require('../entities/EntityRole'),
  SystemUserRoles = require('../enum/SystemUserRoles'),
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

    let {email, firstName, lastName, password, avatar, isBusiness, invite} = options,
				encryptedPassword = password ? authService.generateHashedPassword(password) : '',
        newUser,
        newUserProfile;

      email = email.toLowerCase();
			firstName = firstName.toLowerCase();
      lastName = lastName.toLowerCase();
    const source = invite ? 'v-jobtag' : '';
    const role = isBusiness ? SystemUserRoles.BUSINESS : SystemUserRoles.USER;
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
          role,
				} : {
					email,
					firstName,
					lastName,
          slug,
          source,
          role,
        });
        const userData = await self.saveUser(newUser);
        const newProfileData = { userId: userData._id };
        if (avatar) {
          newProfileData.avatar = avatar;
        }
        newUserProfile = new EntityProfile(newProfileData);
        const userProfileData = await self.saveUserProfile(newUserProfile);
        const res = userData.toJson({ isSafeOutput: true });
        res.profile = userProfileData.toJson();

        const newBusinessData = { user: userData._id };
        const newUserBusiness = new EntityBusiness(newBusinessData);
        const userBusinessData = await self.saveUserBusiness(newUserBusiness);
        res.businesses = [userBusinessData.toJson()];

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

        if (userData.role === SystemUserRoles.BUSINESS) {
          const businesses = await self.getUserBusinesses(userId);
          userData.businesses = businesses;
          userData.isBusiness = true;
        } else {
          userData.isBusiness = false;
        }
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
        if (userData.role === SystemUserRoles.BUSINESS) {
          const businesses = await self.getUserBusinesses(userId);
          userData.businesses = businesses;
          userData.isBusiness = true;
        } else {
          userData.isBusiness = false;
        }
        return userData;
      }
      throw new ApiError('User not found');
    } catch (err) {
      throw err;
    }
  }

  async getUserByEmailIfExists(email) {
    let self = this,
      user = null,
      userData = null;

    user = await self.findUserByEmail({ email });
    if (user) userData = user.toJson({ isSafeOutput: true });
    return userData;
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
        if (userData.role === SystemUserRoles.BUSINESS) {
          const businesses = await self.getUserBusinesses(user.getId());
          userData.businesses = businesses;
          userData.isBusiness = true;
        } else {
          userData.isBusiness = false;
        }
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
          {
            name: 'Get your profile sharing link',
            completed: userProfile.openedShareModal,
          }
        ],
      };
      const sentConnectionRequestCount = await db.collection('connections').countDocuments({
        from: user.id.toString(),
      });
      // const acceptedInvitationCount = await db.collection('connections').countDocuments({
      //   to: user.id.toString(),
      //   status: ConnectionStatus.CONNECTED,
      // });
      const jobWithCoworkerCount = await db.collection('works').countDocuments({
        user: new mongodb.ObjectID(user.id.toString()),
        coworkers: { $exists: true, $not: { $size: 0 } },
      });
      const jobWhereVerifiedCoworkerCount = await db.collection('works').countDocuments({
        verifiers: user.id.toString(),
      });
      // const jobWhereVerifiedByCoworkerCount = await db.collection('works').countDocuments({
      //   user: new mongodb.ObjectID(user.id.toString()),
      //   verifiers: { $exists: true, $not: { $size: 0 } },
      // });
      const userCoworkers = await this.getUserCoworkers(user.slug);
      const userCoworkerCount = userCoworkers.length;
      const connected = {
        name: 'connected',
        earned: sentConnectionRequestCount > 0 && jobWithCoworkerCount > 0 && jobWhereVerifiedCoworkerCount > 0 && userCoworkerCount > 9 ? true : false,
        coworkerCount: userCoworkerCount,
        actions: [
          {
            name: 'Connect with a Coworker',
            completed: sentConnectionRequestCount > 0 ? true : false,
          },
          // {
          //   name: 'Accept an invitation',
          //   completed: acceptedInvitationCount > 0 ? true : false,
          // },
          {
            name: 'Add a coworker to a job',
            completed: jobWithCoworkerCount > 0 ? true : false,
          },
          {
            name: 'Verify a coworker did a job',
            completed: jobWhereVerifiedCoworkerCount > 0 ? true : false,
          },
          // {
          //   name: 'Get Verified on a job by another coworker',
          //   completed: jobWhereVerifiedByCoworkerCount > 0 ? true : false,
          // },
          {
            name: 'Get 10 total Coworker Connections',
            completed: userCoworkerCount > 9 ? true : false,
          },
        ],
      };

      return [cityFreelancer, activeFreelancer, readyAndWilling, connected];
    } catch (err) {
      throw new ApiError(err.message);
    }
  }

  async updateUser(userId, data) {
    const identityAnalytics = new IdentityAnalytics(JOLLY.config.SEGMENT.WRITE_KEY);
    let self = this,
      currentUser = null,
      user = null,
      profile = null;

    try {
      currentUser = await self.findUserById(userId);
      const currentUserData = currentUser.toJson({ isSafeOutput: true });
      const { email, firstName, lastName, loginCount } = data;
      if (email || firstName || lastName || loginCount) {
        const data = {};
        if(loginCount) {
          data.loginCount = loginCount;
        }
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
        identityAnalytics.send(userId);
        const userData = user.toJson({ isSafeOutput: true });
        if (data.profile) {
          const updatedProfile = await self.updateUserProfile(userId, data.profile);
          const updatedProfileData = updatedProfile.toJson();
          userData.profile = updatedProfileData;

          await this.checkCityFreelancerBadge(userId);
          await this.checkReadyAndWillingBadge(userId);

        }
        if (data.business) {
          const businessName = data.business.name;
          const bSlug = await self.generateBusinessSlug({ name: businessName });
          data.business.slug = bSlug;
          await self.updateUserBusiness(userId, data.business);
        }
        return userData;
      }
      throw new ApiError('Wrong user id');
    } catch (err) {
      throw err;
    }
  }

  async checkCityFreelancerBadge(userId) {
    try {
      const analytics = new Analytics(JOLLY.config.SEGMENT.WRITE_KEY);
      const db = this.getDefaultDB();
      const userRoles = await db.collection('roles').find({ user_id: new mongodb.ObjectID(userId) }).toArray();
      const user = await this.getUserById(userId);
      if (userRoles.length > 0 && user.profile.location) {
        if (!user.profile.cityFreelancer) {
          await this.updateUserProfile(userId, { cityFreelancer: true });
          analytics.track({
            userId,
            event: 'Badge Earned',
            properties: {
              type: 'city freelancer',
            }
          });
        }
      }
    } catch (err) {
      throw new ApiError(err.message);
    }
  }

  async checkActiveFreelancerBadge(userId) {
    try {
      const analytics = new Analytics(JOLLY.config.SEGMENT.WRITE_KEY);
      const db = this.getDefaultDB();
      const userJobCountWithin60Days = await db.collection('works').countDocuments({
        user: new mongodb.ObjectID(userId),
        date_created: { $gt:new Date(Date.now() - 24*60*60*1000*60) }
      });
      const user = await this.getUserById(userId);
      if (userJobCountWithin60Days > 0) {
        if (!user.profile.activeFreelancer) {
          await this.updateUserProfile(userId, { activeFreelancer: true });
          analytics.track({
            userId,
            event: 'Badge Earned',
            properties: {
              type: 'active job streak',
            }
          });
        }
      }
    } catch (err) {
      throw new ApiError(err.message);
    }
  }

  async checkReadyAndWillingBadge(userId) {
    try {
      const analytics = new Analytics(JOLLY.config.SEGMENT.WRITE_KEY);
      const db = this.getDefaultDB();
      const user = await this.getUserById(userId);
      const userProfile = user.profile;
      const setContactOptions = userProfile.receiveEmail || userProfile.receiveSMS || userProfile.receiveCall;
      if (
        userProfile.avatar &&
        userProfile.bio &&
        userProfile.resume &&
        userProfile.verifiedPhone &&
        setContactOptions &&
        userProfile.openedShareModal
      ) {
        if (!user.profile.readyAndWilling) {
          await this.updateUserProfile(userId, { readyAndWilling: true });
          analytics.track({
            userId,
            event: 'Badge Earned',
            properties: {
              type: 'ready and willing',
            }
          });
        }
      }
    } catch (err) {
      throw new ApiError(err.message);
    }
  }

  async checkConnectedBadge(userId) {
    try {
      const analytics = new Analytics(JOLLY.config.SEGMENT.WRITE_KEY);
      const db = this.getDefaultDB();
      const user = await this.getUserById(userId);
      const userProfile = user.profile;
      const sentConnectionRequestCount = await db.collection('connections').countDocuments({
        from: user.id.toString(),
      });
      const jobWithCoworkerCount = await db.collection('works').countDocuments({
        user: new mongodb.ObjectID(user.id.toString()),
        coworkers: { $exists: true, $not: { $size: 0 } },
      });
      const jobWhereVerifiedCoworkerCount = await db.collection('works').countDocuments({
        verifiers: user.id.toString(),
      });
      const userCoworkers = await this.getUserCoworkers(user.slug);
      const userCoworkerCount = userCoworkers.length;

      if (
        sentConnectionRequestCount > 0 &&
        jobWithCoworkerCount > 0 &&
        jobWhereVerifiedCoworkerCount > 0
      ) {
        let howConnected = '';
        if (userCoworkerCount > 99) {
          howConnected = 'super connected';
        } else if (userCoworkerCount > 49) {
          howConnected = 'very connected';
        } else if (userCoworkerCount > 24) {
          howConnected = 'well connected';
        } else if (userCoworkerCount > 9) {
          howConnected = 'connected';
        }

        if (howConnected !== '' && userProfile.connected !== howConnected) {
          await this.updateUserProfile(userId, { connected: howConnected });
          analytics.track({
            userId,
            event: 'Badge Earned',
            properties: {
              type: howConnected,
            }
          });
        }
      }
    } catch (err) {
      throw new ApiError(err.message);
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

  async deleteImage(userId, image, avatar, backgroundImage) {
    AWS.config.update({ accessKeyId: JOLLY.config.AWS.ACCESS_KEY_ID, secretAccessKey: JOLLY.config.AWS.SECRET_ACCESS_KEY });
    const S3 = new AWS.S3();
    const db = this.getDefaultDB();
    try {
      const filePath = image.split('/').pop();
      const params = {
        Bucket: JOLLY.config.S3.BUCKET,
        Key: filePath,
      };
      const promises = [];
      promises.concat(await S3.deleteObject(params));
      promises.concat(
        await db.collection('files')
                .deleteOne({user_id: new mongodb.ObjectID(userId), path: image})
      );
      if(JSON.parse(avatar)) {
        promises.concat(
          await db.collection('profiles')
            .updateOne(
              {userId: new mongodb.ObjectID(userId)},
              {
                $set: {
                  avatar: '',
                },
              }
            )
        );
      }
      if(JSON.parse(backgroundImage)) {
        promises.concat(
          await db.collection('profiles')
            .updateOne(
              {userId: new mongodb.ObjectID(userId)},
              {
                $set: {
                  backgroundImage: '',
                },
              }
            )
        );
      }
      Promise.all(promises).then(() => { return true ;})
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
      let users = await db.collection('users').aggregate(aggregates);
      const count = await db.collection('users').countDocuments(match);
      const pages = perPage ? Math.ceil(count/perPage) : 1;
      users = await async.mapLimit(users, 20, async (user) => {
        const works = await db.collection('works').find({ user: user._id }).toArray();
        const userProfile = await db.collection('profiles').findOne({ userId: user._id });
        let allPosition = await db.collection('roles').distinct('name', {user_id: user._id});
        allPosition = allPosition.join();
        const connections = await db.collection('connections')
          .find({
            '$and': [
              {
                '$or': [
                  {
                    'from': user._id.toString()
                  },
                  {
                    'to': user._id.toString()
                  }
                ]
              },
              { 'connectionType' : 'f2f'},
              { 'status' : 'CONNECTED'},
              { 'isCoworker': false}
            ]
          }).count();
        const postCount = await db.collection('posts').find({ user: user._id }).count();
        const coworkers = await db.collection('connections')
          .find({
            '$and': [
              {
                '$or': [
                  {
                    'from': user._id.toString()
                  },
                  {
                    'to': user._id.toString()
                  }
                ]
              },
              { 'connectionType' : 'f2f'},
              { 'status' : 'CONNECTED'},
              { 'isCoworker': true}
            ]
          }).count();

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
          posts: postCount,
          coworkers,
          topPosition,
          top2ndPosition,
          city: userProfile.location,
          connections,
          allPosition
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
  async searchCityUsers(city, query, page, perPage, role, activeStatus, userId) {
    const db = this.getDefaultDB();
    const skip = page && perPage ? (page - 1) * perPage : 0;
    const aggregates = [
      {
        $match : {
          userId: { $ne: new mongodb.ObjectID(userId) },
        }
      },
      { $sort  : { userId : -1 } },
    ];
    if (city) {
      aggregates[0]['$match']['location'] = city
    }
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
    if (role) {
      aggregates.push({
        $lookup: {
          from: "roles",
          localField: "userId",
          foreignField: "user_id",
          as: "roles"
        }
      });
      aggregates.push({
        $unwind: "$roles"
      });
      aggregates.push({
        $match : {
          'roles.name': role,
        }
      });
    }
    if (activeStatus && activeStatus !== '') {
      aggregates.push({
        $lookup: {
          from: "works",
          localField: "userId",
          foreignField: "user",
          as: "userworks"
        }
      });
      aggregates.push({
        $unwind: "$userId"
      });
      if (activeStatus === 'Active')
        aggregates.push({
          $match : {
            'userworks.date_created': { $gt: new Date(Date.now() - 24*60*60*1000*60) }
          }
        });
      else if (activeStatus === 'Inactive')
        aggregates.push({
          $match : {
            $or: [
              { 'userworks.slug': { $exists: false} },
              { 'userworks.date_created': { $lte: new Date(Date.now() - 24*60*60*1000*60) } }
            ]
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
      let users = await Promise.map(profiles, profile => this.getUserById(profile.userId));

      return {
        total: data[0].meta[0] ? data[0].meta[0].total : 0,
        page: data[0].meta[0] && data[0].meta[0].page ? data[0].meta[0].page : 1,
        users,
      };
    } catch (err) {
      throw new ApiError(err.message);
    }
  }

  async searchCityUsersConnected(city, query, page, perPage, role, activeStatus, businessId) {
    const db = this.getDefaultDB();
    const skip = page && perPage ? (page - 1) * perPage : 0;

    const connectionController = JOLLY.controller.ConnectionController;

    let queryConnections1 = {
      to: { $in: [businessId] },
      status: ConnectionStatus.CONNECTED
    };
    let queryConnections2 = {
      from: { $in: [businessId] },
      status: ConnectionStatus.CONNECTED
    };

    const connections1 = await connectionController
      .findConnections(queryConnections1);
    const usersFromConnection1 = connections1.map(connection => connection.from);
    const connections2 = await connectionController
      .findConnections(queryConnections2);
    const usersFromConnection2 = connections2.map(connection => connection.to);
    let userIds = usersFromConnection1.concat(usersFromConnection2);
    userIds = userIds.filter((v, i, arr) => arr.indexOf(v) === i);
    userIds = await Promise.map(userIds, userId =>
      new mongodb.ObjectID(userId)
    );

    const aggregates = [
      {
        $match : {
          userId: { $in: userIds },
        }
      },
      { $sort  : { userId : -1 } },
    ];
    if (city) {
      aggregates[0]['$match']['location'] = city
    }
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
    if (role) {
      aggregates.push({
        $lookup: {
          from: "roles",
          localField: "userId",
          foreignField: "user_id",
          as: "roles"
        }
      });
      aggregates.push({
        $unwind: "$roles"
      });
      aggregates.push({
        $match : {
          'roles.name': role,
        }
      });
    }
    if (activeStatus && activeStatus !== '') {
      aggregates.push({
        $lookup: {
          from: "works",
          localField: "userId",
          foreignField: "user",
          as: "userworks"
        }
      });
      aggregates.push({
        $unwind: "$userId"
      });
      if (activeStatus === 'Active')
        aggregates.push({
          $match : {
            'userworks.date_created': { $gt: new Date(Date.now() - 24*60*60*1000*60) }
          }
        });
      else if (activeStatus === 'Inactive')
        aggregates.push({
          $match : {
            $or: [
              { 'userworks.slug': { $exists: false} },
              { 'userworks.date_created': { $lte: new Date(Date.now() - 24*60*60*1000*60) } }
            ]
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
      let users = await Promise.map(profiles, profile => this.getUserById(profile.userId));

      return {
        total: data[0].meta[0] ? data[0].meta[0].total : 0,
        page: data[0].meta[0] && data[0].meta[0].page ? data[0].meta[0].page : 1,
        users,
      };
    } catch (err) {
      throw new ApiError(err.message);
    }
  }

  async getUserCoworkers(userSlug) {
    const db = this.getDefaultDB();
    let coworkers;

    try {
      const connectionController = JOLLY.controller.ConnectionController;
      const user = await this.getUserBySlug(userSlug);
      const userId = user.id.toString();
      let queryConnections1 = { to: { $in: [userId, user.email] }, status: ConnectionStatus.CONNECTED, isCoworker: true};
      let queryConnections2 = { from: { $in: [ userId, user.email]}, status: ConnectionStatus.CONNECTED, isCoworker: true};

      const connections1 = await connectionController
        .findConnections(queryConnections1);
      const coworkersFromConnection1 = connections1.map(connection => connection.from);
      const connections2 = await connectionController
        .findConnections(queryConnections2);
      const coworkersFromConnection2 = connections2.map(connection => connection.to);
      const connectionCoworkerIds = coworkersFromConnection1.concat(coworkersFromConnection2);

      const coworkerIds = connectionCoworkerIds.filter((v, i, arr) => arr.indexOf(v) === i);

      coworkers = await Promise.map(coworkerIds, coworkerId =>
        checkEmail(coworkerId)
          ? this.getUserByEmail(coworkerId.toLowerCase())
          : this.getUserById(coworkerId)
      );
      return coworkers;
    } catch (err) {
      throw new ApiError(err.message);
    }
  }

  async getUserConnections(userId, city, query, role, connection) {
    const db = this.getDefaultDB();
    let connections = [];
    try {
      const connectionController = JOLLY.controller.ConnectionController;
      const user = await this.getUserById(userId);
      let queryConnections1 = {
        to: { $in: [userId, user.email] },
        status: ConnectionStatus.CONNECTED
      };
      let queryConnections2 = {
        from: { $in: [ userId, user.email] },
        status: ConnectionStatus.CONNECTED,
      };
      if(connection === 'coworkers'){
        queryConnections1['isCoworker'] = true;
        queryConnections2['isCoworker'] = true;
      }
      if(connection === 'connections'){
        queryConnections1['isCoworker'] = false;
        queryConnections2['isCoworker'] = false;
      }
      const connections1 = await connectionController
        .findConnections(queryConnections1);
      const usersFromConnection1 = connections1.map(connection => connection.from);
      const connections2 = await connectionController
        .findConnections(queryConnections2);
      const usersFromConnection2 = connections2.map(connection => connection.to);
      let userIds = usersFromConnection1.concat(usersFromConnection2);
      userIds = userIds.filter((v, i, arr) => arr.indexOf(v) === i);

      const connectionIds = await Promise.map(userIds, userId =>
        checkEmail(userId)
          ? this.getUserByEmail(userId).id
          : new mongodb.ObjectID(userId)
      );
      const aggregates = [
        {
          $match : {
            userId: { $in: connectionIds },
          }
        },
        { $sort  : { userId : -1 } },
      ];
      if (city) {
        aggregates[0]['$match']['location'] = city
      }
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
      if (role) {
        aggregates.push({
          $lookup: {
            from: "roles",
            localField: "userId",
            foreignField: "user_id",
            as: "roles"
          }
        });
        aggregates.push({
          $unwind: "$roles"
        });
        aggregates.push({
          $match : {
            'roles.name': role,
          }
        });
      }
      const connectionProfile = await db.collection('profiles').aggregate(aggregates).toArray();
      connections = await Promise.map(connectionProfile, profile =>
        checkEmail(profile.userId)
          ? this.getUserByEmail(profile.userId.toLowerCase())
          : this.getUserById(profile.userId)
      );

      connections = await Promise.map(connections, profile => {
        const newProfile = Object.assign({}, profile);
        const foundConnection1 = connections1.filter(connection => {
          return connection.from === profile.id.toString() && connection.to === userId
        });
        const foundConnection2 = connections2.filter(connection => {
          return connection.to === profile.id.toString() && connection.from === userId
        });
        let foundConnection = foundConnection1.concat(foundConnection2);
        foundConnection = foundConnection.filter((v, i, arr) => arr.indexOf(v) === i);

        newProfile.isCoworker = foundConnection.length > 0 ? foundConnection[0].isCoworker : false;
        return newProfile;
      });

      return connections;
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

  getUserBusinesses (userId) {

		let db = this.getDefaultDB(),
      business = null;
		return new Promise((resolve, reject) => {

			db.collection('businesses').find({
				user: new mongodb.ObjectID(userId),
			}).toArray().then((dataBusinesses) => {

				if (dataBusinesses) {
          dataBusinesses = dataBusinesses.map(data => new EntityBusiness(data).toJson());
				}

				resolve (dataBusinesses);

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

  generateBusinessSlug(options) {
		return new Promise((resolve, reject) => {
			let db = this.getDefaultDB();
			db.collection('businesses').countDocuments(options).then(count => {
				const slug = count === 0
					? `${options.name.split(' ').join('-')}`
					: `${options.name.split(' ').join('-')}-${count}`;
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
    });
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

  /**
	 * Save user business into database.
	 * @param {EntityBusiness} business - User business entity we are going to save into system.
	 * @returns {Promise}
	 * @resolve {EntityBusiness}
	 */
	saveUserBusiness (business) {

		let db = this.getDefaultDB(),
			collectionName = 'businesses',
			businessData = business.toJson(),
			businessEntity;

    const fieldNames = ['id', 'name', 'category'];

    fieldNames.forEach(field => {
      if (businessData[field] == null) {
        delete (businessData[field]);
      }
    });
		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.insertOne(businessData)
				.then((result) => {
          businessEntity = new EntityBusiness(businessData);

					resolve(businessEntity);
				})
				.catch(reject);

			});
  }

  updateUserBusiness(userId, data) {
    let db = this.getDefaultDB(),
      collectionName = 'businesses',
      business = null;

		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.updateOne({ user: new mongodb.ObjectID(userId) }, { $set: data })
				.then(() => {
					return db.collection(collectionName).findOne({
            user: new mongodb.ObjectID(userId),
          });
        })
        .then((data) => {

          if (data) {

            business = new EntityBusiness(data);
          }

          resolve (business);

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
    const workController = JOLLY.controller.WorkController;
    const connectionController = JOLLY.controller.ConnectionController;
    const self = this;
    try {
      const workData = invite.work;
      const originalAddMethod = workData.addMethod;
      workData.user = user.id;
      workData.addMethod = 'tagged';
      workData.coworkers = workData.verifiers;
      const newWork = await self.saveWork(workData);
      await workController.addVerifiers(invite.rootWorkId, user.id.toString());
      const newWorkData = newWork.toJson({});
      const newRole = await self.saveRole(workData.role, user);
      if(workData.verifiers && workData.verifiers[0]) {
        await connectionController.createCoworkerConnection(workData.verifiers[0], user.id.toString());
      }
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

  async setUserTrusted(userId) {
    let self = this,
      user = null;
    try {
      const data = { trusted: true };
      user = await self.updateUserCollection(userId, data);
      return user;
    } catch (err) {
      throw err;
    }
  }

}

module.exports = UserController;
