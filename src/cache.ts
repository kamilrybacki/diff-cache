import * as core from '@actions/core';
import * as actionsConsole from './actionsConsole.js';
import fs from 'fs/promises';
import {
  create as createArtifactClient,
  ArtifactClient
} from '@actions/artifact';
import { getOctokit, context } from '@actions/github';
import { SimpleCrypto } from "simple-crypto-js"

import { GitHub } from '@actions/github/lib/utils';
import { CommitComparisonResponse } from './types.js';

class SimpleCache {
  repoPublicKey: string;
  repoPublicKeyId: string;
  artifactClient: ArtifactClient;
  authenticatedAPI: InstanceType<typeof GitHub>;
  encryptor: SimpleCrypto;
  source: string;
  target: string;
  private static __instance: SimpleCache | undefined = undefined;

  constructor(
    authenticatedAPI: InstanceType<typeof GitHub>,
    repoPublicKey: string,
    repoPublicKeyId: string,
    source: string,
    target: string
  ) {
    this.authenticatedAPI = authenticatedAPI;
    this.repoPublicKey = repoPublicKey;
    this.repoPublicKeyId = repoPublicKeyId;
    this.artifactClient = createArtifactClient();
    this.encryptor = new SimpleCrypto(repoPublicKey);
    this.source = source;
    this.target = target;
  }

  static access = async function (token: string): Promise<SimpleCache> {
    if (!SimpleCache.__instance) {
      await SimpleCache.initialize(token)
        .then((instance: SimpleCache) => SimpleCache.__instance = instance);
    }
    return SimpleCache.__instance as SimpleCache;
  }

  static initialize = async (token: string): Promise<SimpleCache> => {
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
        return new SimpleCache(authenticatedAPI, data.key, data.key_id, source, target);
      })
      .catch((error) => {
        throw new Error(`Unable to initialize SimpleCache: ${error}`);
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

  diff = async function (this: SimpleCache, include: string, exclude: string): Promise<string> {
    console.log(`Checking changed files for ${include} ${exclude ? `and excluding ${exclude}` : ''}`);
    await this.authenticatedAPI.rest.repos.compareCommitsWithBasehead({
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
        const changedFiles = data.files
          ?.filter((file: {filename: string}) => file.filename.match(new RegExp(include)))
          .filter((file: {filename: string}) => !exclude || !file.filename.match(new RegExp(exclude)))
          .map((file: {filename: string}) => file.filename)
          .join(' ');
        actionsConsole.info(`Changed files: ${changedFiles}`);
        return changedFiles;
      })
  };

  load = async function (this: SimpleCache, tag: string): Promise<string> {
    return await this.artifactClient.downloadArtifact(tag, '/tmp')
      .then(async ({downloadPath}: {downloadPath: string}) => {
        core.info(`Downloaded artifact to ${downloadPath}`);
        return await fs.readFile(downloadPath, 'utf-8')
          .then((encryptedValue: string) => this.decrypt(encryptedValue))
      })
  };

  decrypt = function (this: SimpleCache, encrypted: string): string {
    return this.encryptor.decrypt(encrypted) as string;
  };

  save = async function (this: SimpleCache, tag: string, value: string): Promise<boolean> {
    const encryptedValue = this.encrypt(value);
    return await fs.writeFile(`/tmp/${tag}`, encryptedValue, 'utf-8')
      .then(() => core.info(`Cached value for ${tag}: ${value}`))
      .then(async () => await this.artifactClient.uploadArtifact(tag, [tag], '/tmp')
        .then(() => core.info(`Uploaded artifact for ${tag}`)).then(() => true))
        .catch((error) => {
          core.error(`Unable to cache ${tag}: ${error}`);
          return false;
        }
      );
  };

  encrypt = function (this: SimpleCache, message: string): string {
    return this.encryptor.encrypt(message) as string;
  };

}

export default SimpleCache;
