/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: ["src/**/*.js"],
  coverageDirectory: "coverage",
  clearMocks: true,
};
