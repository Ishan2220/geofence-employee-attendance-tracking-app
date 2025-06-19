// Import app.json values
const appJson = require('./app.json');

// Export a function that returns an object, which makes it compatible with app.json
module.exports = {
  ...appJson.expo,
  // Add offline settings
  updates: {
    enabled: false, // Disable automatic updates for offline development
    fallbackToCacheTimeout: 0
  },
  // Other settings that work in offline mode
  web: {
    bundler: 'metro'
  },
  extra: {
    ...appJson.expo.extra,
    offlineMode: true,
    eas: appJson.expo.extra?.eas
  }
}; 