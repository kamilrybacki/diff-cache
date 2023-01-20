import core from '@actions/core';
import {getOctokit, context} from '@actions/github';

export const prerun = async () => {
  const token = core.getInput('token', {required: true});
  const api = getOctokit(token);
  await api.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}', {
    owner: context.repo.owner,
    repo: context.repo.repo,
    run_id: context.runId,
  }).then((response) => {
    const {data} = response;
    console.log(JSON.stringify(data, null, 2));
  });
};
