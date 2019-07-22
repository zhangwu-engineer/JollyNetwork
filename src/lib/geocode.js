const googleMapsClient = require('@google/maps').createClient({
  key: 'AIzaSyCeIMFnng49GSYI1bvoWkCGf9b_SMSp5So',
  Promise: Promise
});

const geocode = (address) => {
  return new Promise(async (resolve, reject) => {
    googleMapsClient.geocode({ address: address}).asPromise()
      .then((response) => {
        resolve(response.json.results[0].geometry.location);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

module.exports = geocode;
