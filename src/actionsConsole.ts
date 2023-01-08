import * as core from '@actions/core';

export const info = (message: string): void => {
  core.info(message);
  console.info(message);
};


export const fail = (message: string): void => {
  core.setFailed(message);
  console.error(message);
  throw new Error(message);
}