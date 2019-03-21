/**
 * Unit controller class, in charge of transactions related to user's units.
 */
const mongodb = require('mongodb');
const Analytics = require('analytics-node');
const Promise = require('bluebird');
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
      const {category, content, location, user} = options;
      const analytics = new Analytics(JOLLY.config.SEGMENT.WRITE_KEY);

      const newPost = new EntityPost({
        category,
        content,
        location,
        user,
      });

      const post = await this.savePost(newPost);
      const postData = post.toJson({});

      analytics.track({
        userId: user,
        event: 'Post Created',
        properties: {
          postID: postData.id,
          posterID: user,
          postType: postData.category,
          city: postData.location,
        }
      });

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
    const searchQuery = {
      category: { $in: query.categories },
    }
    if (query.location !== '' && query.location === 'my-posts') {
      searchQuery.user = new mongodb.ObjectID(userId)
    } else {
      searchQuery.location = query.location;
    }
    try {
      const rawPosts = await db.collection('posts').find(searchQuery).sort({ date_created: -1 }).toArray();
      const posts = rawPosts.map(post => (new EntityPost(post)).toJson({}));
      const populatedPosts = await Promise.map(posts, async post => {
        try {
          const populatedPost = post;
          const user = await userController.getUserById(post.user);
          populatedPost.user = user;
          return populatedPost;
        } catch(err) {
        }
      }, { concurrency: 1 });
      return populatedPosts;
    } catch (err) {
      throw new ApiError(err.message);
    }
  }

  async votePost(postId, userId) {
    const db = this.getDefaultDB();
    const analytics = new Analytics(JOLLY.config.SEGMENT.WRITE_KEY);
    try {
      await db
        .collection('posts')
        .updateOne({
          _id: new mongodb.ObjectID(postId),
        }, {
          $push: { votes: userId },
        });
      const post = await db.collection('posts').findOne({ _id: new mongodb.ObjectID(postId) });
      analytics.track({
        userId,
        event: 'Helpful Clicked',
        properties: {
          postID: postId,
          userID: userId,
        }
      });
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
}

module.exports = PostController;
