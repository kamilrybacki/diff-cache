import * as core from '@actions/core';
import DiffCache from './src/cache.js';

export const run = async () => {
  let include: string;
  let exclude: string;
  let token: string;

  if (!process.env.MANUAL_POST) {
    include = core.getInput('include', {required: true});
    exclude = core.getInput('exclude');
    token = core.getInput('token', {required: true});
  } else {
    include = process.env.TESTS_INCLUDE as string;
    exclude = process.env.TESTS_EXCLUDE as string;
    token = process.env.TESTS_TOKEN as string;
  }

  if (!token) {
    core.setFailed('No token provided.');
  }
  if (!include) {
    core.setFailed('No include provided.');
  }
  if (!exclude) {
    exclude = '';
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
