/**
 * Unit controller class, in charge of transactions related to user's units.
 */
const mongodb = require('mongodb');
const Analytics = require('analytics-node');
const Promise = require('bluebird');
const IdentityAnalytics = require('../analytics/identity');
const PostAnalytics = require('../analytics/post');
const geocode = require('../lib/geocode');
const EntityPost = require('../entities/EntityPost'),
	DbNames = require('../enum/DbNames');


class PostController {

	/**
     * Controller constructor method.
	 * @returns {PostController|*}
	 */
	constructor () {

		if ( !PostController.instance ) {

			PostController.instance = this;
		}

		return PostController.instance;
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
	 * create new post.
	 * @param {Object} options
	 * @returns {Promise<Object>}
	 */
	async addPost (options) {
    try {
      const {category, content, location, user, headers} = options;
      const postAnalytics = new PostAnalytics(JOLLY.config.SEGMENT.WRITE_KEY, headers);
      const identityAnalytics = new IdentityAnalytics(JOLLY.config.SEGMENT.WRITE_KEY, headers);
      const geo_location = await geocode(location);
      const newPost = new EntityPost({
        category,
        content,
        location,
        user,
        geo_location: this.point(geo_location),
      });

      const post = await this.savePost(newPost);
      const postData = post.toJson({});

      identityAnalytics.send(user);
      postAnalytics.send(user, postData);

      return postData;

    } catch (err) {
      throw new ApiError(err.message);
    }
	}

	listPosts(cb) {

		let Database = JOLLY.service.Db;

		Database.query(DbNames.DB, 'posts', (userPostList) => {

			let itemList = [];

			if (userPostList) {

				userPostList.forEach((postData) => {

					let postObject = new EntityPost(postData);

					itemList.push(postObject.toJson({}));
				})

			}

			cb(itemList);
		});
  }

  findPostById (id) {

		let db = this.getDefaultDB(),
			post = null;
		return new Promise((resolve, reject) => {

			db.collection('posts').findOne({
				_id: new mongodb.ObjectID(id),
			}).then((data) => {

				if (data) {

					post = new EntityPost(data);
				}

				resolve (post);

			}).catch(reject);

		});
  }

  async findPosts(query, userId) {
    const db = this.getDefaultDB();
    const userController = JOLLY.controller.UserController;
    const commentController = JOLLY.controller.CommentController;
    let searchQuery = {};
    let aggregate = [];

    if(query.id) {
      aggregate.push({ $match : { _id : new mongodb.ObjectID(query.id) } });
    } else {
      if (query.location !== '' && query.location === 'my-posts') {
        aggregate.push({ $match : { user : new mongodb.ObjectID(userId) } });
      } else {
        const geo_location = await geocode(query.location);
        aggregate.push(
          {
            $geoNear: {
              near: {
                type: "Point",
                coordinates: [ geo_location.lng, geo_location.lat]
              },
              distanceField: "distance",
              maxDistance: 80467.2,
              spherical: true
            }
          }
        );
      }
      aggregate.push({ $match : { category : { $in: query.categories } } });
    }

    try {
      const rawPosts = await db.collection('posts').aggregate(aggregate).sort({ date_created: -1 }).toArray();
      const posts = rawPosts.map(post => (new EntityPost(post)).toJson({}));
      const populatedPosts = await Promise.map(posts, async post => {
        return await new Promise(function(resolve, reject) {
          try {
            const comment = commentController.findComments({ post: new mongodb.ObjectID(post.id)});
            const user = userController.getUserById(post.user);
            Promise.all([comment, user]).then((result) => {
              const populatedPost = post;
              populatedPost.user = result[1];
              populatedPost.fullComments = result[0];
              populatedPost.showComments = false;
              populatedPost.commentPage = 1;
              resolve(populatedPost);
            });
          } catch(err) {
            reject(err);
          }
        });
      }, { concurrency: 20 });
      return populatedPosts;
    } catch (err) {
      throw new ApiError(err.message);
    }
  }

  async votePost(options) {
    const db = this.getDefaultDB();
    const { postId, userId, headers } = options;
    const postAnalytics = new PostAnalytics(JOLLY.config.SEGMENT.WRITE_KEY, headers);
    const identityAnalytics = new IdentityAnalytics(JOLLY.config.SEGMENT.WRITE_KEY, headers);
    try {
      await db
        .collection('posts')
        .updateOne({
          _id: new mongodb.ObjectID(postId),
        }, {
          $push: { votes: userId },
        });
      const post = await db.collection('posts').findOne({ _id: new mongodb.ObjectID(postId) });
      identityAnalytics.send(userId);
      postAnalytics.sendVote(userId, postId);

      await db
        .collection('profiles')
        .updateOne({
          userId: new mongodb.ObjectID(post.user.toString()),
        }, {
          $inc: { cred: 1 },
        });
      return true;
    } catch (err) {
      throw new ApiError(err.message);
    }
  }
	/**
	 * Save post into database.
	 * @param {EntityPost} post - Post entity we are going to register into system.
	 * @returns {Promise}
	 * @resolve {EntityPost}
	 */
	async savePost (post) {

		let db = this.getDefaultDB(),
			collectionName = 'posts',
			postData = post.toJson(),
			postEntity;

		if (postData.id == null) {
			delete (postData.id);
		}

    try {
      await db.collection(collectionName).insertOne(postData);
      postEntity = new EntityPost(postData);

      return postEntity;
    } catch (err) {
      throw err;
    }

  }

  async deletePost(id) {
    const db = this.getDefaultDB();
    try {
      await db.collection("posts").deleteOne({_id: new mongodb.ObjectID(id)});
    } catch (err) {
      throw new ApiError(err.message);
    }
  }

  async updatePost(id, data) {
    const db = this.getDefaultDB();
    try {
      await db.collection("posts").updateOne({_id: new mongodb.ObjectID(id)}, { $set: data });
    } catch (err) {
      throw new ApiError(err.message);
    }
  }

  getUserPostCount(userId) {
    let db = this.getDefaultDB();
    return new Promise((resolve, reject) => {
      let postCount = db.collection('posts')
        .find({
          user: new mongodb.ObjectID(userId),
        }).count();
      resolve(postCount);
    });
  }

  getUserPostHelpfulCount(userId) {
    let db = this.getDefaultDB();
    return new Promise((resolve, reject) => {
      let postHelpfulCount = db.collection('posts')
        .find({ 'votes': {'$all': [ userId.toString() ]}}).count();
      resolve(postHelpfulCount);
    });
  }

  point(location) {
    console.log(location);
    return {
      coordinates : [
        location.lng,
        location.lat
      ],
      type : "Point"
    }
  }
}

module.exports = PostController;
