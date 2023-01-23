import * as core from '@actions/core';
import DiffCache from './src/cache.js';

export const run = async () => {
  const include = core.getInput('include', {required: true});
  const exclude = core.getInput('exclude');
  const token = core.getInput('token', {required: true});

  if (!token) {
    core.setFailed('No token provided.');
  }
  if (!include) {
    core.setFailed('No include provided.');
  }
  core.info(`Using regex: ${include}`);
  if (exclude) core.info(`Using ignore: ${exclude}`);

  const cacheTag = `${include}&&${exclude}`;
  await DiffCache
    .access(token)
    .then(async (cache: DiffCache) => {
      await cache.lazyLoadCache()
        .then(() => cache.save(cacheTag, ''));
    })
    .then(() => core.info(`Cache for ${cacheTag} cleared!`));
};

run();
