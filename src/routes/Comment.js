/**
 * Comment Route Handler
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const asyncMiddleware = require('../lib/AsyncMiddleware');
const buildContext = require('../analytics/helper/buildContext');
let authService = JOLLY.service.Authentication,
	commentController = JOLLY.controller.CommentController;


/**
 * create new comment into system.
 */
router.post('/', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  const params = Object.assign({}, req.body, { user: req.userId, headers: buildContext(req) });
	const commentData = await commentController.addComment(params);
  res.apiSuccess({ comment: commentData });
}));

router.delete('/:id', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  await commentController.deleteComment(req.params.id);
	res.apiSuccess({});
}));

module.exports = router;
