module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['jest-chrome'],
  testMatch: ['**/tests/unit/**/*.test.js'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
};