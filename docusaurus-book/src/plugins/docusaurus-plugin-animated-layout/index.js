const path = require('path');

module.exports = function animatedLayoutPlugin(context, options) {
  return {
    name: 'docusaurus-plugin-animated-layout',

    getThemePath() {
      return path.resolve(__dirname, './theme');
    },
  };
};