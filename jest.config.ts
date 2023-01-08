import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts?$': 'ts-jest',
    '^.+\\.js?$': 'babel-jest',
  },
  transformIgnorePatterns: ["node_modules/(?!@ngrx|(?!deck.gl)|(?!jest-cli)|ng-dynamic)"],
}
export default config;
