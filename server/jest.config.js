module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.js"],
  collectCoverageFrom: [
    "utils/**/*.js",
    "routes/**/*.js",
    "!**/node_modules/**",
  ],
};
