import * as core from '@actions/core';
import fs from 'fs/promises';
import { getOctokit, context } from '@actions/github';
import { SimpleCrypto } from "simple-crypto-js"
import LZString from 'lz-string';

import { GitHub } from '@actions/github/lib/utils';
import { CommitComparisonResponse } from './types.js';


class DiffCache {
  repoPublicKey: string;
  repoPublicKeyId: string;
  authenticatedAPI: InstanceType<typeof GitHub>;
  source: string;
  target: string;
  encrypt: (input: string) => string;
  decrypt: (input: string) => string
  private static __instance: DiffCache | undefined = undefined;

  constructor (
    authenticatedAPI: InstanceType<typeof GitHub>,
    repoPublicKey: string,
    repoPublicKeyId: string,
    source: string,
    target: string
  ) {
    this.authenticatedAPI = authenticatedAPI;
    this.repoPublicKey = repoPublicKey;
    this.repoPublicKeyId = repoPublicKeyId;
    this.source = source;
    this.target = target;
    const encryptor: SimpleCrypto = new SimpleCrypto(repoPublicKey);
    this.encrypt = (input: string) => encryptor.encrypt(input) as string;
    this.decrypt = (input: string) => encryptor.decrypt(input) as string;
  }

  static access = async function (token: string): Promise<DiffCache> {
    if (!DiffCache.__instance) {
      await DiffCache.initialize(token)
        .then((instance: DiffCache) => DiffCache.__instance = instance);
    }
    return DiffCache.__instance as DiffCache;
  }

  private static initialize = async (token: string): Promise<DiffCache> => {
    const authenticatedAPI = getOctokit(token)
    core.info('Successfully authenticated with GitHub API');
    return await authenticatedAPI.rest.actions.getRepoPublicKey({
      owner: context.repo.owner,
      repo: context.repo.repo,
    })
      .then(({data}) => {
        process.env['ACTIONS_RUNTIME_TOKEN'] = token;
        core.info(`Successfully retrieved repo public key`);
        core.info(`Repo public key: ${data.key}`);
        core.info(`Repo public key id: ${data.key_id}`);
        const {source, target} = this.determineDiffStates();
        return new DiffCache(authenticatedAPI, data.key, data.key_id, source, target);
      })
      .catch((error) => {
        throw new Error(`Unable to initialize SimpleCache: ${error}`);
      })
  };

  diff = async function (this: DiffCache, include: string, exclude: string): Promise<string> {
    console.log(`Checking changed files using pattern ${include} ${exclude ? `and excluding according to pattern ${exclude}` : ''}`);
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
        const changedFiles = data.files
          ?.filter((file: {filename: string}) => file.filename.match(new RegExp(include)))
          .filter((file: {filename: string}) => !exclude || !file.filename.match(new RegExp(exclude)))
          .map((file: {filename: string}) => file.filename)
          .join(' ');
        core.info(`Changed files: ${changedFiles}`);
        return changedFiles as string;
      })
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

  save = async function (this: DiffCache, tag: string, value: string): Promise<void> {
    return await this.uploadCache(tag, value)
      .then(({status}) => {
        if (status != 201) {
          throw new Error(`Unable to upload cache named ${tag}`)
        }
        core.info(`Uploaded artifact for ${tag}`)
      })
      .catch((error) => {
        throw new Error(`Unable to cache ${tag}: ${error}`);
      });
  };

  uploadCache = async function (this: DiffCache, tag: string, rawContent: string): Promise<{status: number}> {
    core.setOutput('files', rawContent)
    const compressedValue = LZString.compress(rawContent);
    const encryptedValue = this.encrypt(compressedValue);
    return await this.authenticatedAPI.request(
      'PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}', {
        owner: context.repo.owner,
        repo: context.repo.repo,
        secret_name: tag,
        encrypted_value: encryptedValue,
        key_id: this.repoPublicKeyId
      }
    )
  }

  downloadCache = async function (this: DiffCache, tag: string): Promise<string> {
    core.info(`Downloading cache tagged ${tag}`);
    return 'Test';
  };

  load = async function (this: DiffCache, tag: string): Promise<string> {
    return await this.downloadCache(tag)
      .then((compressedPayload: string) => LZString.decompress(compressedPayload) as string)
      .catch((error) => {
        throw new Error('Cannot perform decompression: ' + error);
      })
      .then((decompressedPayload: string) => this.decrypt(decompressedPayload))
      .catch((error) => {
        throw new Error('Cannot perform decryption: ' + error);
      });
  };
}

export default DiffCache;
