import {describe, test, expect, beforeAll, beforeEach} from "@jest/globals";
import {OctokitResponse} from "@octokit/types";
import {getOctokit} from "@actions/github";
import {GitHub} from "@actions/github/lib/utils";
import {context} from "@actions/github";
import LZString from "lz-string";
import DiffCache from "../src/cache";
import {CommitComparisonResponse} from "../src/types";

type EmojiResponse = OctokitResponse<{[key: string]: string}> | undefined

describe("Test caching mechanisms", () => {
  const testsToken: string | undefined = process.env.TESTS_TOKEN;
  let authenticatedOctokit: InstanceType<typeof GitHub>;
  let authenticatedDiffCache: DiffCache;

  const TEST_CACHE_CONTENT: string = LZString.compress(
    JSON.stringify({
      bob: "Bob",
      alice: "Alice",
    })
  );

  beforeAll(async () => {
    expect(testsToken).toBeDefined();
    process.env.CACHE_SECRET_NAME = "TEST_SECRET";
    authenticatedOctokit = getOctokit(testsToken as string);
  });

  beforeEach(async () => {
    authenticatedDiffCache = await DiffCache.access(testsToken as string);
    authenticatedDiffCache.setDebug(true);
  });

  describe("Check if DiffCache initialization works", () => {
    test("Check if OctoKit API was authenticated correctly", async () => {
      expect(authenticatedOctokit).toBeDefined();
      expect(authenticatedDiffCache).toBeDefined();

      const diffCacheEmojis: EmojiResponse = await authenticatedDiffCache.authenticatedAPI.rest.emojis.get();
      const octokitEmojis: EmojiResponse = await authenticatedOctokit?.rest.emojis.get();

      expect(diffCacheEmojis?.status).toBe(200);
      expect(octokitEmojis?.status).toBe(200);
      expect(diffCacheEmojis?.data).toEqual(octokitEmojis?.data);
    });

    test("Check if DiffCache repo info was initialized correctly", () => {
      expect(authenticatedDiffCache.repoPublicKey).toBeDefined();
      expect(authenticatedDiffCache.repoPublicKeyId).toBeDefined();
      if (context.eventName === "pull_request") {
        expect(authenticatedDiffCache.source).toBe(context.payload.pull_request?.base.sha);
        expect(authenticatedDiffCache.target).toBe(context.payload.pull_request?.head.sha);
      }
      if (context.eventName === "push") {
        expect(authenticatedDiffCache.source).toBe(context.payload.before);
        expect(authenticatedDiffCache.target).toBe(context.payload.after);
      }
    });

    test("Check if DiffCache encryptor was initialized correctly", () => {
      const testString = context.actor;
      const encryptedString = authenticatedDiffCache.encrypt(testString);
      expect(encryptedString).toBeDefined();
      expect(encryptedString).not.toBe(testString);
      expect(typeof encryptedString).toBe('string');
    });

    const checkWhichFilesHaveChangedAtThisCommit = async (): Promise<string[]> => {
      return await authenticatedOctokit.rest.repos.compareCommits({
        owner: context.repo.owner,
        repo: context.repo.repo,
        base: authenticatedDiffCache.source,
        head: authenticatedDiffCache.target,
      })
        .then(({data}: {data: CommitComparisonResponse}) => {
          if (data.files === undefined) {
            return [];
          }
          return data.files.map((file) => file.filename);
        });
    };

    test("Test the Git diff function", async () => {
      const changedFiles = await checkWhichFilesHaveChangedAtThisCommit();
      const includeRegexp = changedFiles.join('|');
      const diffFromDiffCache = await authenticatedDiffCache.diff(includeRegexp, '');
      expect(diffFromDiffCache).toBeDefined();
      expect(typeof diffFromDiffCache).toBe('string');
      expect(diffFromDiffCache).toBe(changedFiles.join(' '));
    });

    test("Check if lazy loading cache works", async () => {
      process.env.CACHE_SECRET = TEST_CACHE_CONTENT;
      await authenticatedDiffCache.lazyLoadCache();
      const readableTestCache = JSON.parse(LZString.decompress(TEST_CACHE_CONTENT) as string);
      expect(authenticatedDiffCache.cache).toEqual(readableTestCache);
    });

    const checkIfTestSecretExistsInRepo = async () => {
      const secretsList = await authenticatedOctokit.rest.actions.listRepoSecrets({
        owner: context.repo.owner,
        repo: context.repo.repo,
      });

      expect(secretsList.status).toBe(200);
      const secretNames = secretsList.data.secrets.map((secret) => secret.name);
      expect(secretNames).toContain("TEST_SECRET");
    };

    const deleteTestSecretFromRepo = async () => {
      await authenticatedOctokit.request('DELETE /repos/{owner}/{repo}/actions/secrets/{secret_name}', {
        owner: context.repo.owner,
        repo: context.repo.repo,
        secret_name: process.env.CACHE_SECRET_NAME as string,
      });
    };

    test("Load, modify and save cache", () => {
      const bobEntry = authenticatedDiffCache.load('bob');
      expect(bobEntry).toBe('Bob');
      authenticatedDiffCache.save('bob', 'Bobby');
      checkIfTestSecretExistsInRepo();
      deleteTestSecretFromRepo();
    });

  });
});
