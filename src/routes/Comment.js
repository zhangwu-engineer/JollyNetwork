/**
 * Comment Route Handler
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const asyncMiddleware = require('../lib/AsyncMiddleware');
let authService = JOLLY.service.Authentication,
	commentController = JOLLY.controller.CommentController;


/**
 * create new comment into system.
 */
router.post('/', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {

	const commentData = await commentController.addComment(Object.assign({}, req.body, { user: req.userId }));
  res.apiSuccess({
    comment: commentData
  });
}));

router.delete('/:id', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  await commentController.deleteComment(req.params.id);
	res.apiSuccess({});
}));

module.exports = router;
