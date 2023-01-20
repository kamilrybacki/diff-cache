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
    .then(({data}) => {
      data[0].steps.forEach(({url}: {url: string}) => core.info(`Step: ${url}`))
    }
  ).catch((error: Error) => {
    throw new Error(`Unable to initialize SimpleCache: ${error.message}`);
  }
  );
};
