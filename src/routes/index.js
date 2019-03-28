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
    },

    {
      path: '/connection',
      handler: require ('../routes/Connection')
    },

    {
      path: '/post',
      handler: require ('../routes/Post')
    },

    {
      path: '/comment',
      handler: require ('../routes/Comment')
    }
];

module.exports = ApplicationRouteList;
