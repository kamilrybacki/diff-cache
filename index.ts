import * as core from '@actions/core';
import check from './src/check';
import update from './src/update';
import Secrets from './src/hooks/secrets';

async function run() {
  try {
    const include = core.getInput('regex');
    const exclude = core.getInput('ignore');

    core.info(`Using regex: ${include}`);
    core.info(`Using ignore: ${exclude}`);

    await Secrets.access().then((secrets: Secrets) => {
      core.info(`Repo public key: ${secrets.repoPublicKey}`);
      core.info(`Repo public key id: ${secrets.repoPublicKeyId}`);
    });

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
