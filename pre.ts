import core from '@actions/core';
import {getOctokit, context} from '@actions/github';

export const prerun = async () => {
  const token = core.getInput('token', {required: true});
  const api = getOctokit(token);
  core.info(JSON.stringify(context)

};
