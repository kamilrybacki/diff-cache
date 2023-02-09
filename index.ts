import * as core from '@actions/core';
import DiffCache from './src/cache.js';

const run = async () => {
  const include = core.getInput('include');
  if (include) core.info(`Using regex: ${include}`);
  const exclude = core.getInput('exclude');
  if (exclude) core.info(`Using ignore: ${exclude}`);

  const cacheTag = include ? `${include}&&${exclude}`: 'all';

  const token = core.getInput('token', {required: true});
  await DiffCache
    .access(token)
    .then(async (cache: DiffCache) => {
      await cache.diff(include, exclude)
        .then(async (stagedFiles: string) => {
          const cachedFiles = await cache.load(cacheTag);
          const presentCachedFiles = await cache.removeFilesNotPresentInCurrentCommit(cachedFiles.split(' '));
          core.info(`Cached files: ${cachedFiles}`);
          core.info(`Staged files: ${stagedFiles}`);
          if (stagedFiles.length) {
            const presentStagedFiles = await cache.removeFilesNotPresentInCurrentCommit(stagedFiles.split(' '));
            const allFiles = `${presentCachedFiles} ${presentStagedFiles}`.split(' ');
            const filesToCache = [
              ...new Set(allFiles.filter((file: string) => file.length))
            ];
            core.info(`Files to cache: ${filesToCache.join(' ')}`)
            if(filesToCache.length) {
              const incorrect_entires = cache.validateFiles(filesToCache, include, exclude);
              if (incorrect_entires.length > 0) {
                core.info(`Incorrect entries: ${incorrect_entires}. Removing from cache list.`)
              }
              const cleanCache = filesToCache
                                .filter((file: string) => !incorrect_entires.includes(file))
                                .join(' ');
              if (cleanCache.length && cleanCache!== cachedFiles) {
                core.info(`Files to cache: ${cleanCache}`);
                await cache.save(cacheTag, cleanCache);
              } else {
                core.info('No files to cache!');
              }
            } else {
              core.info('No files to cache!');
            }
          }
        });
  });
  core.info('DiffCache finished!')
};

run();
