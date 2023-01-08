import * as actionsConsole from './src/actionsConsole';
import * as core from '@actions/core';
import check from './src/check.js';
import update from './src/update.js';
import SimpleCache from './src/cache.js';

async function run() {
  const include = core.getInput('include');
  core.info(`Using regex: ${include}`);

  const exclude = core.getInput('exclude');
  if (exclude) core.info(`Using ignore: ${exclude}`);

  const token = core.getInput('token');
  await SimpleCache
    .access(token)
    .then(async () => {
      await check(include, exclude)
        .then(async (stagedFiles: string) => {
          stagedFiles != '' ? await update(stagedFiles) : core.info('No staged files to lint');
      })
    .catch((error: Error) => actionsConsole.fail(`Unable to check staged files: ${error}`));
  });
}

run();
