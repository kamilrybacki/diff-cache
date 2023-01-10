import * as core from '@actions/core';
import DiffCache from './src/cache.js';

async function run() {
  const include = core.getInput('include', {required: true});
  core.info(`Using regex: ${include}`);

  const exclude = core.getInput('exclude');
  if (exclude) core.info(`Using ignore: ${exclude}`);

  const token = core.getInput('token', {required: true});
  await DiffCache
    .access(token)
    .then(async (cache: DiffCache) => {
      await cache.diff(include, exclude)
        .then(async (stagedFiles: string) => {
          await cache.load(`${include}_${exclude}`)
            .catch((error: Error) => {
              throw new Error(`Unable to check staged files: ${error}`)
            })
            .then(async (cachedFiles: string) => {
              const cachedFilesList = cachedFiles.split(' ');
              const stagedFilesList = stagedFiles.split(' ');
              if (cachedFilesList.length && stagedFilesList.length) {
                const filesToCache = stagedFilesList.filter((file: string) => !cachedFilesList.includes(file));
                if (filesToCache.length && filesToCache !== cachedFilesList) {
                  core.info(`Files to cache: ${filesToCache}`);
                  await cache.save(`${include}_${exclude}`, filesToCache.join(' '));
                }
              }
            });
        });
  });
}

run();
