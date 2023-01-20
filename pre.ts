import core from '@actions/core';
import {getOctokit, context} from '@actions/github';

export const prerun = async () => {
  const token = core.getInput('token', {required: true});
  const api = getOctokit(token);
  await api.request('GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}', {
    owner: context.repo.owner,
    repo: context.repo.repo,
    workflow_id: context.runId,
  }).then(({data}) => core.info(JSON.stringify(data, null, 2)));
};
