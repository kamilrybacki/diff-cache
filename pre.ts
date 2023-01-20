import core from '@actions/core';
import {getOctokit, context} from '@actions/github';
import { request } from 'http';

export const prerun = async () => {
  const token = core.getInput('token', {required: true});
  const api = getOctokit(token);
  await api.request('GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}', {
    owner: context.repo.owner,
    repo: context.repo.repo,
    workflow_id: context.workflow,
  })
    .then(({data}) => {
      core.info(JSON.stringify(data, null, 2));
      // const currentWorkflowUrl = data.url;
      // core.info(`Current workflow url: ${currentWorkflowUrl}`);
      // return request(currentWorkflowUrl);
    })
    // .catch((error: Error) => {
    //   throw new Error(`Unable to get current workflow: ${error.message}`);
    // })
    // .then(({path}) => {
    //   core.info(`Current workflow file: ${path}`);
    // });
};
