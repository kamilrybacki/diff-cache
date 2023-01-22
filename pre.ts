import core from '@actions/core';
import ActiveWorkflowFileReader from './src/workflow.js';

const CACHE_SECRET_REGEXP = /cache_secret.*$/;

export const prerun = async () => {
  if (!core.getInput('cache_secret', {required: true})) {
    core.setFailed('No secret for cache provided.');
  }
  const token = core.getInput('token', {required: true});
  await ActiveWorkflowFileReader.auth(token)
    .then(async (workflow: ActiveWorkflowFileReader) => {
      const workflowData = await workflow.data;
      const line = findSecretName(workflowData.content);
      core.info(`Found secret name: ${JSON.stringify(line)}`);
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
