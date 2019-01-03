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
      path: '/role',
      handler: require ('../routes/Role')
    },

    {
      path: '/unit',
      handler: require ('../routes/Unit')
    },

    {
      path: '/work',
      handler: require ('../routes/Work')
    },

    {
      path: '/endorsement',
      handler: require ('../routes/Endorsement')
    }
];

module.exports = ApplicationRouteList;
