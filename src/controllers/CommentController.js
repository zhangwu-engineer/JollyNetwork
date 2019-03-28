/**
 * Unit controller class, in charge of transactions related to user's units.
 */
const mongodb = require('mongodb');
const Analytics = require('analytics-node');
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
    
    try {
      const { content, post, user} = options;
      const analytics = new Analytics(JOLLY.config.SEGMENT.WRITE_KEY);

      const newComment = new EntityComment({
        content,
        post,
        user,
      });

      const comment = await this.saveComment(newComment);
      const commentData = comment.toJson({});

      await db
        .collection('posts')
        .updateOne({
          _id: new mongodb.ObjectID(post),
        }, {
          $push: { comments: commentData.id.toString() },
        });

      analytics.track({
        userId: user,
        event: 'Comment Submitted',
        properties: {
          postID: commentData.post,
        }
      });

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
