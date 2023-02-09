import * as core from '@actions/core';
import { getOctokit, context } from '@actions/github';
import * as Sodium from 'libsodium-wrappers';
import LZString from 'lz-string';

import { GitHub } from '@actions/github/lib/utils';
import { CommitComparisonResponse, GitTreeAPIEntryData } from './types.js';
import { OctokitResponse } from '@octokit/types';

class DiffCache {
  authenticatedAPI: InstanceType<typeof GitHub>;
  repoPublicKey: string;
  repoPublicKeyId: string;
  source: string;
  target: string;
  encryptor: typeof Sodium | undefined = undefined;
  cache: { [key: string]: string } | undefined = undefined;
  debug: boolean;
  disable_escape: boolean;
  private static __instance: DiffCache | undefined = undefined;

  constructor (
    authenticatedAPI: InstanceType<typeof GitHub>,
    repoPublicKey: string,
    repoPublicKeyId: string,
    source: string,
    target: string,
    encryptor: typeof Sodium
  ) {
    this.authenticatedAPI = authenticatedAPI;
    this.repoPublicKey = repoPublicKey;
    this.repoPublicKeyId = repoPublicKeyId;
    this.source = source;
    this.target = target;
    this.encryptor = encryptor;
    this.debug = false;
    this.disable_escape = core.getInput('disable_escape').toUpperCase() === 'TRUE';
  }

  static access = async function (token: string): Promise<DiffCache> {
    if (!DiffCache.__instance) {
      await DiffCache.initialize(token)
        .then((instance: DiffCache) => {
          DiffCache.__instance = instance
      });
    }
    process.env.GITHUB_TOKEN = token;
    process.env.ACTIONS_RUNTIME_TOKEN = token;
    return DiffCache.__instance as DiffCache;
  }

  private static initialize = async function (token: string): Promise<DiffCache> {
    if (!process.env.CACHE_SECRET_NAME) {
      throw new Error('Cache secret name was not defined. Check the preparation step defined in pre.ts script.');
    }
    const authenticatedAPI = getOctokit(token)
    core.info('Successfully authenticated with GitHub API');
    return await authenticatedAPI.rest.actions.getRepoPublicKey({
      owner: context.repo.owner,
      repo: context.repo.repo,
    })
      .then(async function ({data}) {
        core.info(`Successfully retrieved repo public key`);
        const {source, target} = DiffCache.determineDiffStates();
        await Sodium.ready;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return new DiffCache(authenticatedAPI, data.key, data.key_id, source, target, Sodium.default);
      })
      .catch((error: Error) => {
        throw new Error(`Unable to initialize SimpleCache: ${error.message}`);
      });
  };

  static determineDiffStates = (): { source: string, target: string } => {
    if (context.eventName === 'pull_request'){
      return {
        source: context.payload.pull_request?.base.sha,
        target: context.payload.pull_request?.head.sha
      };
    } else if (context.eventName === 'push') {
      return {
        source: context.payload.before,
        target: context.payload.after
      };
    } else {
      throw new Error(`${context.eventName} event type is not supported by SimpleCache. Check the documentation for supported events.`);
    }
  };

  setDebug = function (this: DiffCache, debug: boolean): void {
    this.debug = debug;
  };

  diff = async function (this: DiffCache, include: string, exclude: string): Promise<string> {
    core.info(`Checking changed files using pattern ${include} ${exclude ? `and excluding according to pattern ${exclude}` : ''}`);
    return await this.authenticatedAPI.rest.repos.compareCommitsWithBasehead({
      owner: context.repo.owner,
      repo: context.repo.repo,
      basehead: `${this.source}...${this.target}`
    })
      .catch((error) => {
        throw new Error(`Unable to compare commits: ${error}`);
      })
      .then(async ({
          data,
          status: responseStatus,
        }: {
          data: CommitComparisonResponse,
          status: number,
        }) => {
        if (responseStatus != 200) {
          throw new Error('Request to compare commits failed');
        }
        if (!data.files || data.files?.length === 0) {
          throw new Error('No files changed');
        }
        const changedFiles = this.filterWithRegex(data.files, include, exclude);
        core.info(`Changed files: ${changedFiles}`);
        return changedFiles as string;
      })
  };

  escapeRegexString = function (this: DiffCache, source: string): string {
    return this.disable_escape ? source.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') : source;
  };

  filterWithRegex = function (this: DiffCache, files: { filename: string }[], include: string, exclude: string): string {
    return files
      .map((file: {filename: string}) => file.filename)
      .filter((filename: string) => {
        const escapedInclude = this.escapeRegexString(include);
        return include ? filename.match(new RegExp(escapedInclude, 'g')) : true;
      })
      .filter((filename: string) => {
        const escapedExclude = this.escapeRegexString(exclude);
        return exclude ? (!exclude || !filename.match(new RegExp(escapedExclude, 'g'))) : true;
      })
      .join(' ');
  };

  validateFiles = function (this: DiffCache, files: string[], include: string, exclude: string): string[] {
    core.info(`Validating files: ${files} against pattern ${include} ${exclude ? `and excluding according to pattern ${exclude}` : ''}`)
    return files.reduce((incorrect_files: string[], file: string) => {
      const escapedInclude = this.escapeRegexString(include);
      const escapedExclude = this.escapeRegexString(exclude);
      if (!file.match(new RegExp(escapedInclude))) incorrect_files.push(file);
      if (exclude && file.match(new RegExp(escapedExclude))) incorrect_files.push(file);
      return incorrect_files
    }, []);
  };

  save = async function (this: DiffCache, tag: string, value: string): Promise<void> {
    return await this.uploadCache(tag, value)
      .then(({status}) => {
        if (status != 201 && status != 204) {
          throw new Error(`${status}: Unable to upload cache named ${tag}`)
        }
        core.info(`Uploaded cache for ${tag}`)
      })
      .catch((error: Error) => {
        throw new Error(error.message);
      });
  };

  uploadCache = async function (this: DiffCache, tag: string, value: string): Promise<OctokitResponse<unknown, number>> {
    if (!this.cache) {
      throw new Error('Cannot upload cache before loading it into memory. Check if you are calling load() before save()');
    }
    core.setOutput('files', value)
    core.info(`Saving cache for ${tag}...`)
    try {
      this.cache = Object.assign(this.cache, {[tag]: value});
      const cacheString = JSON.stringify(this.cache);
      const compressedCache = LZString.compress(cacheString);
      core.info('Cache compressed!')
      const encryptedCache = this.encrypt(compressedCache);
      core.info('Cache encrypted!')
      return await this.authenticatedAPI.request(
        'PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}', {
          owner: context.repo.owner,
          repo: context.repo.repo,
          secret_name: process.env.CACHE_SECRET_NAME as string,
          encrypted_value: encryptedCache,
          key_id: this.repoPublicKeyId
        }
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Unable to encrypt cache: ${error.message}`);
      } else {
        throw new Error(`Unable to encrypt cache: ${error}`);
      }
    }
  };

  encrypt = function (this: DiffCache, value: string): string {
    if (!this.encryptor) {
      throw new Error('Cannot encrypt cache before loading libsodium');
    }
    const base64_variant = this.encryptor.base64_variants.ORIGINAL;
    const key = this.encryptor.from_base64(this.repoPublicKey, base64_variant);
    const encryptedBytes = this.encryptor.crypto_box_seal(value, key);
    return this.encryptor.to_base64(encryptedBytes, base64_variant);
  };

  load = async function (this: DiffCache, tag: string): string {
    if (!this.cache) await this.lazyLoadCache();
    const currentCache = this.cache as {[key: string]: string};
    return Object.hasOwn(currentCache, tag) ? currentCache[tag] : '';
  };

  lazyLoadCache = async function (this: DiffCache): Promise<void> {
    try {
      const storedCache = this.debug ?
        process.env.CACHE_SECRET as string
        : core.getInput('cache_secret', {required: true});
      core.info('Loaded encrypted cache passed through action input')
      const decompressedCache = LZString.decompress(storedCache) as string;
      if (!decompressedCache) {
        core.info('Cache is empty. Resetting it an empty one.');
        this.cache = {};
      } else {
        core.info('Checking if cache is a valid JSON.')
        this.cache = JSON.parse(decompressedCache);
      }
    } catch (error) {
      core.info('Cache is not a valid JSON due to first time use. Resetting it an empty one.');
      this.cache = {};
    }
  };

  removeFilesNotPresentInCurrentCommit = async function (this: DiffCache, files: string[]): Promise<string[]> {
    const currentCommitFiles = await this.getCurrentCommitFilesList();
    return files.filter((file: string) => currentCommitFiles.includes(file));
  };

  getCurrentCommitFilesList = async function (this: DiffCache): Promise<string[]> {
    return await this.authenticatedAPI.request('GET /repos/{owner}/{repo}/git/trees/{commit}?recursive=1', {
        owner: context.repo.owner,
        repo: context.repo.repo,
        commit: context.sha,
      })
        .catch((error: Error) => {
          throw new Error(`Unable to access current commit tree: ${error.message}`);
        })
        .then(({data}) => data.tree)
        .catch((error: Error) => {
          throw new Error(`Unable to access commit tree from API response: ${error.message}`);
        })
        .then((tree: GitTreeAPIEntryData[]) => tree.map((entry: GitTreeAPIEntryData) => entry.path))
        .catch((error: Error) => {
          throw new Error(`Unable to access commit tree paths from API response: ${error.message}`);
        }
      );
  };
}

export default DiffCache;
