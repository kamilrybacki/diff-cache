import * as core from '@actions/core';
import DiffCache from './src/cache.js';

const run = async () => {
  const include = core.getInput('include', {required: true});
  core.info(`Using regex: ${include}`);

  const exclude = core.getInput('exclude');
  if (exclude) core.info(`Using ignore: ${exclude}`);

  const cacheTag = `${include}&&${exclude}`;

  const secretName = core.getInput('name', {required: true});
  if (secretName) core.info(`Using secret name: ${secretName}`);

  const token = core.getInput('token', {required: true});
  await DiffCache
    .access(token, secretName)
    .then(async (cache: DiffCache) => {
      await cache.diff(include, exclude)
        .then(async (stagedFiles: string) => {
          const cachedFiles = cache.load(cacheTag);
          core.info(`Cached files: ${cachedFiles}`);
          core.info(`Staged files: ${stagedFiles}`);
          if (stagedFiles.length) {
            const allFilesList = `${cachedFiles} ${stagedFiles}`.split(' ');
            const filesToCache = [
              ...new Set(allFilesList.filter((file: string) => file.length))
            ];
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
};

export default run;
