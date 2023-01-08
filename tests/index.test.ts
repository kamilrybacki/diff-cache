import * as core from '@actions/core';
import { context } from '@actions/github';
import { beforeAll, describe, expect, test } from '@jest/globals';
import SimpleCache from '../src/cache';

describe('SimpleCache encryption mechanisms', () => {
  const testMessage = 'This is a test message';
  const accessToken = process.env.GITHUB_TOKEN as string;
  let testCache: SimpleCache | undefined = undefined;

  beforeAll(async () => {
    await SimpleCache.access(accessToken)
      .then(async (cache: SimpleCache) => {
        testCache = cache;
      });
  });

  test('Check if repo key info is correctly set', async () => {
    core.info('Checking if repo key is info correct');
    await testCache?.authenticatedAPI.actions.getRepoPublicKey({
      owner: context.repo.owner,
      repo: context.repo.repo,
    })
      .then(({data}) => {
        expect(testCache?.repoPublicKey).not.toBe(data.key);
        expect(testCache?.repoPublicKeyId).not.toBe(data.key_id);
      })
      .catch((error) => {
        throw new Error(`Unable to retrieve repo public key: ${error}`);
      });
  });
  test('Test message encryption', () => {
    core.info('Encrypting and Decrypting test message');
        const encryptedMessage: string = testCache?.encrypt(testMessage) as string;
        const decryptedMessage: string = testCache?.decrypt(encryptedMessage) as string;
        expect(decryptedMessage).toBe(testMessage);
    });
});
