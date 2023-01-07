/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts?$': 'ts-jest',
     '^.+\\.(js|jsx)?$': 'babel-jest'
  },
  moduleFileExtensions: ["js", "json", "jsx", "ts", "tsx", "json"],
  transformIgnorePatterns: ["node_modules/(?!@ngrx|(?!deck.gl)|ng-dynamic)"],
};