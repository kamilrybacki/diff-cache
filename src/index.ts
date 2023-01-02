import * as core from '@actions/core';
import { check, update } from './smart-lint/stage';
import lint from './smart-lint/lint';

async function run() {
  try {
    core.info((new Date()).toTimeString());
    const command = core.getInput('command');
    core.info(`Running command: ${command}`);
    const regex = core.getInput('regex');
    core.info(`Using regex: ${regex}`);
    const flags = core.getInput('flags');
    core.info(`Using flags: ${flags}`);
    const ignore = core.getInput('ignore');
    core.info(`Using ignore: ${ignore}`);

    await check(regex, ignore)
      .then(async (stagedFiles: string) => {
        stagedFiles != ''
        ? await update(stagedFiles).then(() => lint(command, flags, stagedFiles))
        : core.info('No staged files to lint');
    });

  } catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else if (typeof error === 'string') {
      core.setFailed(error);
    } else {
      core.setFailed('Unknown error! Check the logs for more information.');
    }
  }
}

run();
