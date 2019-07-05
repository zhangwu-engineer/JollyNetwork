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

router.post('/city', authService.verifyUserAuthentication, (req, res, next) => {
  businessController.searchCityBusinesses(req.body.city, req.body.query, req.body.page, req.body.perPage, req.body.role, req.body.activeStatus, req.userId)
    .then(data => {
      res.apiSuccess(data);
    })
    .catch(next);
});

module.exports = router;
