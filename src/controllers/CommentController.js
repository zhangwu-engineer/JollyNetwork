/**
 * Unit controller class, in charge of transactions related to user's units.
 */
const mongodb = require('mongodb');
const CommentAnalytics = require('../analytics/comment');
const Promise = require('bluebird');
const EntityComment = require('../entities/EntityComment'),
	DbNames = require('../enum/DbNames');


class CommentController {

	/**
     * Controller constructor method.
	 * @returns {CommentController|*}
	 */
	constructor () {

		if ( !CommentController.instance ) {

			CommentController.instance = this;
		}

		return CommentController.instance;
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
	 * create new comment.
	 * @param {Object} options
	 * @returns {Promise<Object>}
	 */
	async addComment (options) {

    const db = this.getDefaultDB();
    const mailService = JOLLY.service.Mail;
    const userController = JOLLY.controller.UserController;
    try {
      const { content, post, user, headers } = options;
      const commentAnalytics = new CommentAnalytics(JOLLY.config.SEGMENT.WRITE_KEY, headers);

      const newComment = new EntityComment({
        content,
        post,
        user,
      });

      const comment = await this.saveComment(newComment);
      const commentData = comment.toJson({});
      commentData.user = await userController.getUserById(commentData.user);
      const postData = await db.collection('posts').findOne({ _id: new mongodb.ObjectID(post) });
      if (postData.comments.length === 0) {
        const postCreator = await userController.getUserById(postData.user.toString());
        const userData = await userController.getUserById(user.toString());
        await mailService.sendFirstCommentEmail(postCreator.email, userData, content, postData);
      }

      await db
        .collection('posts')
        .updateOne(
          { _id: new mongodb.ObjectID(post)},
          { $push: { comments: commentData.id.toString() } });

      commentAnalytics.send(user, commentData);

      return commentData;

    } catch (err) {
      throw new ApiError(err.message);
    }

	}

  async findCommentById (id) {

    const db = this.getDefaultDB();

    try {
      const data = await db.collection('comments').findOne({ _id: new mongodb.ObjectID(id) });

      const comment = new EntityComment(data);

      return comment;
    } catch (err) {
      throw new ApiError(err.message);
    }

  }

  async findComments (query) {
    const db = this.getDefaultDB();
    const userController = JOLLY.controller.UserController;
    try {
      const rawComments = await db.collection('comments').find(query).sort({ date_created: -1 }).toArray();
      const comments = rawComments.map(comment => (new EntityComment(comment)).toJson({}));
      const populatedComments = await Promise.map(comments, async comment => {
        try {
          const populatedComment = comment;
          const user = await userController.getUserById(comment.user);
          populatedComment.user = user;
          return populatedComment;
        } catch(err) {
        }
      }, { concurrency: 1 });

      return populatedComments;
    } catch (err) {
      throw new ApiError(err.message);
    }
  }

	/**
	 * Save comment into database.
	 * @param {EntityComment} comment - Comment entity we are going to save into system.
	 * @returns {Promise}
	 * @resolve {EntityComment}
	 */
	async saveComment (comment) {

		let db = this.getDefaultDB(),
			collectionName = 'comments',
			commentData = comment.toJson(),
			commentEntity;

		if (commentData.id == null) {
			delete (commentData.id);
		}

    try {
      await db.collection(collectionName).insertOne(commentData);
      commentEntity = new EntityComment(commentData);

      return commentEntity;
    } catch (err) {
      throw new ApiError(err.message);
    }

  }

  async deleteComment(id) {
    const db = this.getDefaultDB();
    try {
      await db.collection("comments").deleteOne({_id: new mongodb.ObjectID(id)});
    } catch (err) {
      throw new ApiError(err.message);
    }
  }
}

module.exports = CommentController;
