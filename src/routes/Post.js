/**
 * Post Route Handler
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const asyncMiddleware = require('../lib/AsyncMiddleware');
const buildContext = require('../analytics/helper/buildContext');
let authService = JOLLY.service.Authentication,
	postController = JOLLY.controller.PostController;


/**
 * Display user's posts.
 */
router.get('/', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  const posts = await postController.findPosts({});
  res.apiSuccess({ posts });
}));

/**
 * create new post into system.
 */
router.post('/', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  let params = Object.assign({}, req.body, { user: req.userId, headers: buildContext(req) });
	const postData = await postController.addPost(params);
  res.apiSuccess({ post: postData });
}));

router.post('/search', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  const posts = await postController.findPosts(req.body.query, req.userId);
  res.apiSuccess({ posts });
}));

router.post('/:id/vote', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
	await postController.votePost({ postId: req.params.id, userId: req.userId, headers: buildContext(req) });
	res.apiSuccess({});
}));

router.put('/:id', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  await postController.updatePost(req.params.id, req.body);
	res.apiSuccess({});
}));

router.delete('/:id', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  await postController.deletePost(req.params.id);
	res.apiSuccess({});
}));

module.exports = router;
