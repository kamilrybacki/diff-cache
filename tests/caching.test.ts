import * as core from '@actions/core';
import { beforeAll, describe, expect, test } from '@jest/globals';
import SimpleCache from '../src/cache';

describe('SimpleCache caching mechanisms', () => {
  const accessToken = process.env.GITHUB_TOKEN as string;
  const testInfo = {
    'tag': 'TESTINFO',
    'value': 'This is a test value'
  };
  const testMessage = 'This is a test message';
  let testCache: SimpleCache | undefined = undefined;

  beforeAll(async () => {
    await SimpleCache.access(accessToken)
      .then(async (cache: SimpleCache) => {
        testCache = cache;
      });
  });

  test('Test message encryption', () => {
    core.info('Encrypting and Decrypting test message');
        const encryptedMessage: string = testCache?.encrypt(testMessage) as string;
        const decryptedMessage: string = testCache?.decrypt(encryptedMessage) as string;
        expect(decryptedMessage).toBe(testMessage);
  });

  test('Check saving information via GitHub artifacts', async () => {
    core.info(`Saving value for test tag`);
    await testCache?.save(testInfo.tag, testInfo.value)
      .then((success: boolean) => {
        expect(success).toBe(true);
      })
      .catch((error) => {
        throw new Error(`Unable to save test value: ${error}`);
      });
  });

  test('Check loading information via GitHub artifacts', async () => {
    core.info(`Loading value for test tag`);
    await testCache?.load(testInfo.tag)
      .then((value: string) => {
        expect(value).toBe(testInfo.value);
      })
      .catch((error) => {
        throw new Error(`Unable to load test value: ${error}`);
      });
  });
});
