import core from '@actions/core';
import {getOctokit, context} from '@actions/github';

export const prerun = async () => {
  const token = core.getInput('token', {required: true});
  const api = getOctokit(token);
  await api.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs?sort=completed_at:desc', {
    owner: context.repo.owner,
    repo: context.repo.repo,
    run_id: context.runId
  })
    .catch((error: Error) => {
      throw new Error(`Unable to get workflow info: ${error.message}`);
    })
    .then((response) => core.info(`Workflow info: ${JSON.stringify(response.data)}`))
  )
};
