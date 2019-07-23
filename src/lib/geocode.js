const geocode = (address) => {
  const googleMapsClient = require('@google/maps').createClient({
    key: JOLLY.config.GEOCODING_KEY,
    Promise: Promise
  });
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
