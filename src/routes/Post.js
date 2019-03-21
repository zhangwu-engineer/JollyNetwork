/**
 * Post Route Handler
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const asyncMiddleware = require('../lib/AsyncMiddleware');
let authService = JOLLY.service.Authentication,
	postController = JOLLY.controller.PostController;


/**
 * Display user's posts.
 */
router.get('/', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {

  const posts = await postController.findPosts({});
  res.apiSuccess({
    posts,
  });

}));

/**
 * create new post into system.
 */
router.post('/', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {

	const postData = await postController.addPost(Object.assign({}, req.body, { user: req.userId }));
  res.apiSuccess({
    post: postData
  });
}));

router.post('/search', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  const posts = await postController.findPosts(req.body.query, req.userId);
  res.apiSuccess({
    posts,
  });
}));

router.post('/:id/vote', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
	await postController.votePost(req.params.id, req.userId);
	res.apiSuccess({});
}));

router.delete('/:id', authService.verifyUserAuthentication, asyncMiddleware(async (req, res, next) => {
  await postController.deletePost(req.params.id);
	res.apiSuccess({});
}));

module.exports = router;
