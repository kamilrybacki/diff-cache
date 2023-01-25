import * as core from '@actions/core';
import DiffCache from './src/cache.js';

export const run = async () => {
  const include = core.getInput('include');
  if (include) core.info(`Using regex: ${include}`);
  const exclude = core.getInput('exclude');
  if (exclude) core.info(`Using ignore: ${exclude}`);

  const cacheTag = include ? `${include}&&${exclude}`: 'all';

  const token = core.getInput('token', {required: true});
  if (!token) {
    core.setFailed('No token provided.');
  }

  await DiffCache
    .access(token)
    .then(async (cache: DiffCache) => {
      await cache.lazyLoadCache()
        .then(() => cache.save(cacheTag, ''));
    })
    .then(() => core.info(`Cache for ${cacheTag} cleared!`));
};

run();
