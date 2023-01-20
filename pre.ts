import core from '@actions/core';
import {getOctokit, context} from '@actions/github';

export const prerun = async () => {
  const token = core.getInput('token', {required: true});
  const api = getOctokit(token);
  await api.request('GET /repos/{owner}/{repo}/commits/{head_sha}', {
    owner: context.repo.owner,
    repo: context.repo.repo,
    head_sha: context.sha,
  }).then(
    (response) => {
      core.info(`Response: ${JSON.stringify(response)}`);
    }
  )
};
