const { app } = require("./_app.cjs");

module.exports = async function handler(request) {
  return app.fetch(request);
};

module.exports.config = {
  runtime: "nodejs",
  maxDuration: 60,
};
