const { handler } = require("./_app.cjs");

module.exports = handler;

module.exports.config = {
  runtime: "nodejs",
  maxDuration: 60,
};
