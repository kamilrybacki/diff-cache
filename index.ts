import * as core from '@actions/core';
import DiffCache from './src/cache.js';

const run = async () => {
  const include = core.getInput('include', {required: true});
  core.info(`Using regex: ${include}`);

  const exclude = core.getInput('exclude');
  if (exclude) core.info(`Using ignore: ${exclude}`);

  const cacheTag = core.getInput('tag', {required: true});
  if (cacheTag) core.info(`Using cache tag: ${cacheTag}`);

  const token = core.getInput('token', {required: true});
  await DiffCache
    .access(token)
    .then(async (cache: DiffCache) => {
      await cache.diff(include, exclude)
        .then(async (stagedFiles: string) => {
          const cachedFiles = cache.load(cacheTag);
          const cachedFilesList = cachedFiles.split(',');
          const stagedFilesList = stagedFiles.split(',');
          core.info(`Cached files: ${cachedFilesList}`);
          core.info(`Staged files: ${stagedFilesList}`);
          if (stagedFilesList.length) {
            const filesToCache = [...new Set(...stagedFilesList, ...cachedFilesList)];
            cache.validateFiles(filesToCache, include, exclude);
            if (filesToCache.length && filesToCache !== cachedFilesList) {
              core.info(`Files to cache: ${filesToCache}`);
              await cache.save(cacheTag, filesToCache.join(' '));
            } else {
              core.info('No new files to cache!');
            }
          }
        });
  });
};

run();
