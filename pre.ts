import core from '@actions/core';
import ActiveWorkflowFileReader from './src/workflow.js';

const CACHE_SECRET_REGEXP = /cache_secret.*$/;

const run = async () => {
  let token: string;
  if (!process.env.MANUAL_PRE) {
    if (!core.getInput('cache_secret', {required: true})) {
      core.setFailed('No secret for cache provided.');
    }
    token = core.getInput('token', {required: true});
  } else {
    token = process.env.TESTS_TOKEN as string;
  }
  if (!token) {
    core.setFailed('No token provided.');
  }
  await ActiveWorkflowFileReader.auth(token)
    .then(async (workflow: ActiveWorkflowFileReader) => {
      const workflowData = await workflow.data;
      const line = findSecretName(workflowData.content);
      core.exportVariable('CACHE_SECRET_NAME', line);
    }
  );
};

const findSecretName = (content: string) => {
  return content
          .split('\n')
          .filter((line: string) => line.match(CACHE_SECRET_REGEXP))
          .map((line: string) => line.trim().replace(/\s/g,''))[0]
          .split('secrets.')
          .pop()
          ?.split('}}')[0];
};

run();
