const geocode = (address) => {
  const googleMapsClient = require('@google/maps').createClient({
    key: JOLLY.config.GEOCODING_KEY,
    Promise: Promise
  });
  return new Promise(async (resolve, reject) => {
    googleMapsClient.geocode({ address: address}).asPromise()
      .then((response) => {
        if(response.json.results[0]) {
          resolve(response.json.results[0].geometry.location);
        } else {
          resolve({});
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
};

module.exports = geocode;
