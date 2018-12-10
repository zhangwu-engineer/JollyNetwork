/**
 * Application Main Route List
 */

const ApplicationRouteList = [

    {
        path: '/auth',
        handler: require ('../routes/Authentication')
    },

    {
        path: '/user',
        handler: require ('../routes/User')
    },

    {
      path: '/talent',
      handler: require ('../routes/Talent')
    },

    {
      path: '/unit',
      handler: require ('../routes/Unit')
    },

    {
      path: '/work',
      handler: require ('../routes/Work')
    }
];

module.exports = ApplicationRouteList;
