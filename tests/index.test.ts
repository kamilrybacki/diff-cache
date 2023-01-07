import * as core from '@actions/core';
import { context } from '@actions/github';
import { describe, expect, test } from '@jest/globals';
import SimpleCache from '../src/cache';
import 'regenerator-runtime/runtime';

describe('SimpleCache encryption mechanisms', () => {
  const testMessage = 'This is a test message';

  SimpleCache.access()
    .then((testCache: SimpleCache) => {
      test('Check if repo key info is correctly set', async () => {
        core.info('Checking if repo key is info correct');
        await testCache.authenticatedAPI.actions.getRepoPublicKey({
          owner: context.repo.owner,
          repo: context.repo.repo,
        })
          .then(({data}) => {
            expect(testCache.repoPublicKey).not.toBe(data.key);
            expect(testCache.repoPublicKeyId).not.toBe(data.key_id);
          })
          .catch((error) => {
            throw new Error(`Unable to retrieve repo public key: ${error}`);
          });
      });
      test('Test message encryption', () => {
        core.info('Encrypting and Decrypting test message');
            const encryptedMessage: string = testCache.encrypt(testMessage);
            const decryptedMessage: string = testCache.decrypt(encryptedMessage);
            expect(decryptedMessage).toBe(testMessage);
        });
    });
});
