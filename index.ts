import * as core from '@actions/core';
import { check, update } from './src/stage';

async function run() {
  try {
    core.info((new Date()).toTimeString());
    const include = core.getInput('regex');
    core.info(`Using regex: ${include}`);
    const exclude = core.getInput('ignore');
    core.info(`Using ignore: ${exclude}`);

    await check(include, exclude)
      .then(async (stagedFiles: string) => {
        stagedFiles != '' ? await update(stagedFiles) : core.info('No staged files to lint');
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
