/**
 * Unit controller class, in charge of transactions related to user's units.
 */
const mongodb = require('mongodb');
const AWS = require('aws-sdk');
const fileType = require('file-type');
const dateFns = require('date-fns');
const Promise = require('bluebird');
const WorkAnalytics = require('../analytics/work');
const RoleAnalytics = require('../analytics/role');
const IdentityAnalytics = require('../analytics/identity');
const EntityWork = require('../entities/EntityWork'),
  EntityRole = require('../entities/EntityRole'),
  DbNames = require('../enum/DbNames');

class WorkController {

	/**
     * Controller constructor method.
	 * @returns {WorkController|*}
	 */
	constructor () {

		if ( !WorkController.instance ) {

			WorkController.instance = this;
		}

		return WorkController.instance;
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
	 * create new work.
	 * @param {Object} options
	 * @returns {Promise<Object>}
	 */
	async addWork (options) {
    const { title, role, from, to, caption, pinToProfile, photos,
      user, email, firstName, lastName, userSlug, headers } = options;
    const identityAnalytics = new IdentityAnalytics(JOLLY.config.SEGMENT.WRITE_KEY, headers);
    const workAnalytics = new WorkAnalytics(JOLLY.config.SEGMENT.WRITE_KEY, headers);
    const roleAnalytics = new RoleAnalytics(JOLLY.config.SEGMENT.WRITE_KEY, headers);
    const tokenController = JOLLY.controller.TokenController;
    const userController = JOLLY.controller.UserController;
    const mailService = JOLLY.service.Mail;
    AWS.config.update({ accessKeyId: JOLLY.config.AWS.ACCESS_KEY_ID, secretAccessKey: JOLLY.config.AWS.SECRET_ACCESS_KEY });
    try {
      const S3 = new AWS.S3();

      const fromString = dateFns.format(new Date(from), 'YYYYMMDD');
      const toString = dateFns.format(new Date(to), 'YYYYMMDD');
      let slug = `${title.toLowerCase().split(' ').join('-')}-${fromString}-${toString}`;
      slug = slug.normalize('NFD').replace(/[^a-zA-Z0-9\-]/g, '');
      let { coworkers } = options;
      const originalCoworkers = coworkers;
      let newWork;

      let photo_urls = [];

      for (let i = 0; i < photos && photos.length; i += 1) {
        const block = photos[i].split(';');
        const [, base64] = block;
        const [, realData] = base64.split(',');

        const fileBuffer = Buffer.from(realData, 'base64');
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
        photo_urls.push(`${JOLLY.config.S3.BUCKET_LINK}/${filePath}`);
      }

      const emails = coworkers.map(c => ({ email: c.email, existing: !!c.id }));
      coworkers = coworkers.map(c => c.id ? c.id : c.email);

      newWork = new EntityWork({
        title: title.trim(),
        role,
        from,
        to,
        caption,
        pinToProfile,
        coworkers,
        photos: photo_urls,
        slug,
        user,
      });

      const workData = await this.saveWork(newWork);
      const work = workData.toJson({});
      identityAnalytics.send(work.user.toString());

      const newRole = await this.saveRole(role, user);

      workAnalytics.send(user, work, { firstName, lastName, email });

      if (newRole) {
        roleAnalytics.send(user, newRole, { work, firstName, lastName, email});
      }

      originalCoworkers.map(c => {
        workAnalytics.coworkerTagged(user, work, { coworker: c });
      });

      const tokens = mailService.sendInvite(emails, work, { userId: user, firstName: firstName, lastName: lastName, slug: userSlug });
      await tokenController.addTokens(tokens);
      await userController.checkActiveFreelancerBadge(user);
      if (originalCoworkers.length > 0) {
        await userController.checkConnectedBadge(user);
      }
      return work;

    } catch (err) {
      throw new ApiError(err.message);
    }
	}

	listUnits(cb) {

		let Database = JOLLY.service.Db;

		Database.query(DbNames.DB, 'units', (userUnitList) => {

			let itemList = [];

			if (userUnitList) {

				userUnitList.forEach((unitData) => {

					let unitObject = new EntityUnit(unitData);

					itemList.push(unitObject.toJson({}));
				})

			}

			cb(itemList);
		});
  }

  getUserWorks(userId) {
    let db = this.getDefaultDB();
    return new Promise((resolve, reject) => {

      db
        .collection('works')
        .find({
          user: new mongodb.ObjectID(userId),
        })
        .sort({to: -1})
        .toArray((err, result) => {
          if (err) reject(err);
          let itemList = [];

          if (result) {

            result.forEach((workData) => {

              let workObject = new EntityWork(workData);

              itemList.push(workObject.toJson({}));
            })

          }

          resolve (itemList);
        });
    });
  }

  getUserWorksCount(userId) {
    let db = this.getDefaultDB();
    return new Promise((resolve, reject) => {
      let workCount = db.collection('works')
        .find({
          user: new mongodb.ObjectID(userId),
        }).count();
      resolve(workCount);
    });
  }

  getWorksBySlugs(slugs, userId) {
    let db = this.getDefaultDB();
    return new Promise((resolve, reject) => {

      db
        .collection('works')
        .find({
          slug: { $in: slugs },
          user: { $ne: new mongodb.ObjectID(userId) },
        })
        .toArray((err, result) => {
          if (err) reject(err);
          let itemList = [];

          if (result) {

            result.forEach((workData) => {

              let workObject = new EntityWork(workData);

              itemList.push(workObject.toJson({}));
            })

          }

          resolve (itemList);
        });
    });
  }

  getUserVerifiedWorksForRole(userId, role) {
    let db = this.getDefaultDB();
    return new Promise((resolve, reject) => {

      db
        .collection('works')
        .find({
          user: new mongodb.ObjectID(userId),
          role,
          $where: 'this.verifiers.length > 0',
        })
        .toArray((err, result) => {
          if (err) reject(err);
          if (result) {
            resolve(result.length);
          }
          resolve(0);
        });
    });
  }

  findWorkById (id) {

		let db = this.getDefaultDB(),
			work = null;
		return new Promise((resolve, reject) => {

			db.collection('works').findOne({
				_id: new mongodb.ObjectID(id),
			}).then((data) => {

				if (data) {

					work = new EntityWork(data);
				}

				resolve (work);

			}).catch(reject);

		});
  }

  getUserRoleInJob (userId, workSlug) {

		let db = this.getDefaultDB(),
			work = null;
		return new Promise((resolve, reject) => {

			db.collection('works').findOne({
        user: new mongodb.ObjectID(userId),
				slug: workSlug,
			}).then((data) => {

				if (data) {

					resolve(data.role);
				}

				resolve ('');

			}).catch(reject);

		});
  }

  searchWorks (options) {

		let db = this.getDefaultDB(),
      work = null;

    const filter = options;

		return new Promise((resolve, reject) => {

      if (filter.userSlug) {
        db.collection('users').findOne({
          slug: filter.userSlug,
        }).then((data) => {
          filter.user = data._id;
          delete filter.userSlug;

          db.collection('works')
            .find(filter)
            .toArray((err, result) => {
              if (err) reject(err);
              let itemList = [];

              if (result) {

                result.forEach((workData) => {

                  let workObject = new EntityWork(workData);

                  itemList.push(workObject.toJson({}));
                })

              }

              resolve (itemList);
            });

        }).catch(reject);
      } else {
        db.collection('works')
          .find(filter)
          .toArray((err, result) => {
            if (err) reject(err);
            let itemList = [];

            if (result) {

              result.forEach((workData) => {

                let workObject = new EntityWork(workData);

                itemList.push(workObject.toJson({}));
              })

            }

            resolve (itemList);
          });
      }
		});
  }

  findWorkUsers(eventId) {
    let db = this.getDefaultDB(),
      users = [],
      coworkers = [];

    return new Promise((resolve, reject) => {

			db.collection('works').findOne({
				_id: new mongodb.ObjectID(eventId),
			}).then((data) => {
        coworkers = data.coworkers || [];
        if (data.coworkers) {
          data.coworkers.forEach(coworker => {
            users.push({
              type: "invited",
              user: coworker,
            });
          });
        }
        db.collection('works')
          .find({
            slug: data.slug,
            user: { $ne: data.user },
          })
          .toArray((err, result) => {
            if (err) reject(err);

            if (result) {

              result.forEach((workData) => {
                if (coworkers.includes(workData.user.toString())) {
                  const pos = coworkers.indexOf(workData.user.toString());
                  users.splice(pos, 1);
                  coworkers.splice(pos, 1);
                  users.push({
                    type: "verified",
                    user: workData.user,
                    role: workData.role,
                  });
                } else {
                  users.push({
                    type: "verifiable",
                    user: workData.user,
                    role: workData.role,
                  });
                }
              })
            }
            resolve (users);
          });
			}).catch(reject);

		});

  }

  addCoworker(options) {
	  const { id, coworker, user, headers } = options;
    const identityAnalytics = new IdentityAnalytics(JOLLY.config.SEGMENT.WRITE_KEY, headers);
    const workAnalytics = new WorkAnalytics(JOLLY.config.SEGMENT.WRITE_KEY, headers);
    const db = this.getDefaultDB();
    const mailService = JOLLY.service.Mail;
    const emailRegEx = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    let work = null;
    return new Promise((resolve, reject) => {
      db.collection('works')
        .updateOne({
          _id: new mongodb.ObjectID(id),
        }, { $addToSet: { coworkers: coworker } })
        .then(() => {
          db.collection('works').findOne({
            _id: new mongodb.ObjectID(id),
          }).then((data) => {
            if (data) {
              work = new EntityWork(data);
              const workData = work.toJson({});
              identityAnalytics.send(workData.user.toString());
              if (emailRegEx.test(coworker)) {
                workAnalytics.coworkerTagged(user.id.toString(), workData, { coworker });
                const tokens = mailService.sendInvite([{ email: coworker, existing: false }], workData, { userId: user.id, firstName: user.firstName, lastName: user.lastName, slug: user.slug });
                resolve(tokens);
              } else {
                db.collection('users').findOne({
                  _id: new mongodb.ObjectID(coworker),
                }).then((userData) => {
                  workAnalytics.coworkerTagged(user.id.toString(), workData, { coworker: userData });
                  const tokens = mailService.sendInvite([{ email: userData.email, existing: true}], work.toJson({}), { userId: user.id, firstName: user.firstName, lastName: user.lastName, slug: user.slug });
                  resolve(tokens);
                });
              }
            } else {
              reject();
            }
          });
        })
        .catch(reject);
    });
  }

  verifyCoworker(id, options) {
    const db = this.getDefaultDB();
    const connectionController = JOLLY.controller.ConnectionController;
    return Promise.all([
      db.collection('works')
        .updateOne({
          _id: new mongodb.ObjectID(id),
        }, { $push: { coworkers: options.coworker } })
      ,
      db.collection('works')
        .updateOne({
          slug: options.slug,
          user: new mongodb.ObjectID(options.coworker),
        }, { $push: { verifiers: options.verifier } })
    ]).then(async () => {
      let works = await db.collection('works').findOne({ _id: new mongodb.ObjectID(id) });
      await connectionController.createCoworkerConnection(options.coworker, works.user.toString())
    });
  }

  addVerifiers(id, verifier) {
    const db = this.getDefaultDB();
    return Promise.all([
      db.collection('works')
        .updateOne({
          _id: new mongodb.ObjectID(id),
        }, { $push: { verifiers: verifier } })
    ]);
  }

  /**
	 * Save work into database.
	 * @param {EntityWork} work - work entity we are going to register into system.
	 * @returns {Promise}
	 * @resolve {EntityWork}
	 */
	saveWork (work) {

		let db = this.getDefaultDB(),
			collectionName = 'works',
			workData = work.toJson(),
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

  updateUnit(id, data) {
    let db = this.getDefaultDB(),
      collectionName = 'units',
      unit = null;;

		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.updateOne({_id: new mongodb.ObjectID(id)}, { $set: data })
				.then((result) => {
          return db.collection('units').findOne({
            _id: new mongodb.ObjectID(id),
          });
        })
        .then((data) => {

          if (data) {

            unit = new EntityUnit(data);
          }

          resolve (unit);

        })
				.catch(reject);

			});
  }

  deleteUnit(id) {
    let db = this.getDefaultDB(),
      collectionName = 'units';

		return new Promise((resolve, reject) => {

			db.collection(collectionName)
				.deleteOne({_id: new mongodb.ObjectID(id)})
				.then(() => {
          resolve();
        })
				.catch(reject);

			});
  }

  saveRole (role, user) {
		let db = this.getDefaultDB(),
      collectionName = 'roles',
      roleData = null;

		return new Promise((resolve, reject) => {

      db.collection(collectionName)
        .findOne({ name: role, user_id: new mongodb.ObjectID(user) })
        .then((data) => {
          if (data) {
            resolve();
          } else {
            const newRole = new EntityRole({
              name: role,
              user_id: user,
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

  getUserTaggedCoworkerCount(user_id) {
    let db = this.getDefaultDB(),
      collectionName = 'works';
    return new Promise(async (resolve, reject) => {
      let result = await db.collection(collectionName).aggregate([
        { "$match": { "user": new mongodb.ObjectID(user_id.toString()) }},
        {
          '$project': {
            '_id': 1,
            'numberOfCoworkers': { $cond: { if: { $isArray: "$coworkers" }, then: { $size: "$coworkers" }, else: 0} }
          }
        }
      ]).toArray();
      let sumOfCoworkers = 0;
      result.map((m) => sumOfCoworkers += m.numberOfCoworkers);
      resolve(sumOfCoworkers);
    });
  }
}

module.exports = WorkController;
