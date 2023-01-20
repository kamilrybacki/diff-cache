import core from '@actions/core';
import {getOctokit, context} from '@actions/github';

const run = async () => {
  const token = core.getInput('token', {required: true});
  const api = getOctokit(token);
  await api.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs?sort=completed_at:desc', {
    owner: context.repo.owner,
    repo: context.repo.repo,
    run_id: context.runId
  })
    .then(({data}) => {
      const lastStep = data.jobs[0].steps[-1];
      core.info(`Last step: ${lastStep}`);
    }
  );
};

run();