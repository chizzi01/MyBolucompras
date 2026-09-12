module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.jsx?$': ['babel-jest', { configFile: './babel.config.test.js' }],
  },
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  testMatch: ['**/__tests__/**/*.test.js'],
};
