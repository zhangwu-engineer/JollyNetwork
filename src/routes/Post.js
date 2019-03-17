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
router.get('/', authService.verifyUserAuthentication, (req, res) => {

  postController
    .findPosts({})
    .then((posts) => {
      res.apiSuccess({
        posts,
      });
    });
});

/**
 * create new post into system.
 */
router.post('/', authService.verifyUserAuthentication, (req, res) => {

	postController
		.addPost(Object.assign({}, req.body, { user: req.userId }))
		.then((postData) => {
			res.apiSuccess({
				post: postData
			});
		});
});

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

// router.delete('/:id', authService.verifyUserAuthentication, (req, res) => {

// 	unitController
// 		.deleteUnit(req.params.id)
// 		.then(() => {
// 			res.apiSuccess({});
// 		});
// });

module.exports = router;
