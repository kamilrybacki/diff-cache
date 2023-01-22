import type {Config} from 'jest';

const config: Config = {
   transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
    "^.+\\.(js)$": "babel-jest",
  },
  transformIgnorePatterns: [
  ],
};

export default config;