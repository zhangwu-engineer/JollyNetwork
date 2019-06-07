/**
 * Business controller class, in charge of transactions related to businesses.
 */
const mongodb = require('mongodb');

const EntityBusiness = require('../entities/EntityBusiness'),
	DbNames = require('../enum/DbNames');


class BusinessController {

	/**
     * Controller constructor method.
	 * @returns {BusinessController|*}
	 */
	constructor () {

		if ( !BusinessController.instance ) {

			BusinessController.instance = this;
		}

		return BusinessController.instance;
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

  async getBusinessBySlug(slug) {
    let self = this,
		business = null;
		const userController = JOLLY.controller.UserController;

    try {
			business = await self.findBusinessBySlug(slug);
      if (business) {
				const businessData = business.toJson({});
				const userData = await userController.getUserById(businessData.user);
				businessData.user = userData;
        return businessData;
			}
      throw new ApiError('Business not found');
    } catch (err) {
      throw err;
    }
  }
  
  findBusinessBySlug (slug) {

		let db = this.getDefaultDB(),
			business = null;
			
		return new Promise((resolve, reject) => {

			db.collection('businesses').findOne({
			  slug,
			}).then((data) => {
				if (data) {

					business = new EntityBusiness(data);
				}

				resolve (business);

			}).catch(reject);

		});
  }
	
}

module.exports = BusinessController;
