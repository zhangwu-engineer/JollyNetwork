/**
 * Business Route Handler
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const asyncMiddleware = require('../lib/AsyncMiddleware');
let authService = JOLLY.service.Authentication,
  businessController = JOLLY.controller.BusinessController;

router.get('/slug/:slug', (req, res, next) => {
	businessController.getBusinessBySlug(req.params.slug)
		.then(businessData => {
      res.apiSuccess(businessData);
		}).catch(next);

});

module.exports = router;
