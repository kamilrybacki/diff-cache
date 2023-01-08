import * as actionsConsole from '../src/actionsConsole';
import { context } from '@actions/github';
import { beforeAll, describe, expect, test } from '@jest/globals';
import SimpleCache from '../src/cache';

describe('SimpleCache initialization', () => {
  const accessToken = process.env.GITHUB_TOKEN as string;
  let testCache: SimpleCache | undefined = undefined;

  beforeAll(async () => {
    await SimpleCache.access(accessToken)
      .then(async (cache: SimpleCache) => {
        testCache = cache;
      });
  });

  test('Check if repo key info is correctly set', async () => {
    actionsConsole.info('Checking if repo key is info correct');
    await testCache?.authenticatedAPI.actions.getRepoPublicKey({
      owner: context.repo.owner,
      repo: context.repo.repo,
    })
      .catch((error) => actionsConsole.fail(`Unable to retrieve repo public key: ${error}`))
      .then((response) => {
        expect(testCache?.repoPublicKey).toBe(response?.data.key);
        expect(testCache?.repoPublicKeyId).toBe(response?.data.key_id);
      })
  });
});
