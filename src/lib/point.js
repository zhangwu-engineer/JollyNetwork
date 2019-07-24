const point = (location) => {
  return {
    coordinates : [
      location.lng,
      location.lat
    ],
    type : "Point"
  }
};

module.exports = point;
