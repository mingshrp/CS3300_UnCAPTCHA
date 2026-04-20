module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['jest-chrome'],
  testMatch: ['**/tests/unit/**/*.test.js'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  collectCoverageFrom: [
    'background.js',
    'content.js',
    'injected.js',
    'popup.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
};