import * as core from '@actions/core';
import check from './src/check.js';
import update from './src/update.js';
import SimpleCache from './src/cache.js';

async function run() {
  try {
    const include = core.getInput('include');
    core.info(`Using regex: ${include}`);

    const exclude = core.getInput('exclude');
    if (exclude) core.info(`Using ignore: ${exclude}`);

    const token = core.getInput('token');
    await SimpleCache.access(token).then(async (cache: SimpleCache) => {
      core.info(`Public repo key: ${cache.repoPublicKey}`);
      await check(include, exclude)
        .then(async (stagedFiles: string) => {
          stagedFiles != '' ? await update(stagedFiles) : core.info('No staged files to lint');
      });
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
