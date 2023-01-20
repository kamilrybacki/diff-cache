import core from '@actions/core';
import {getOctokit, context} from '@actions/github';
import { request } from 'https';

export const prerun = async () => {
  const token = core.getInput('token', {required: true});
  const api = getOctokit(token);
  await api.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}', {
    owner: context.repo.owner,
    repo: context.repo.repo,
    run_id: context.runId,
  }).then(({data}) => {
    const currentWorkflowUrl = data.workflow_url;
    core.info(`Current workflow url: ${currentWorkflowUrl}`);
    return request(
      currentWorkflowUrl, {
        method: 'GET',
        headers: {
          "Accept": "application/vnd.github+json",
          "Authorization": `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        }
      },
      (res) => {
        res.on('data', (chunk) => {
          core.info(`Current workflow: ${chunk}`);
        });
    });
  });
};
