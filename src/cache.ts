import * as core from '@actions/core';
import fs from 'fs/promises';
import {
  create as createArtifactClient,
  ArtifactClient
} from '@actions/artifact';
import { getOctokit, context } from '@actions/github';
import SimpleCrypto from "simple-crypto-js"

import { RestEndpointMethods } from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types';

class SimpleCache {
  repoPublicKey: string;
  repoPublicKeyId: string;
  artifactClient: ArtifactClient;
  authenticatedAPI: RestEndpointMethods;
  encryptor: SimpleCrypto;
  private static __instance: SimpleCache | undefined = undefined;

  constructor(authenticatedAPI: RestEndpointMethods, repoPublicKey: string, repoPublicKeyId: string) {
    this.authenticatedAPI = authenticatedAPI;
    this.repoPublicKey = repoPublicKey;
    this.repoPublicKeyId = repoPublicKeyId;
    this.artifactClient = createArtifactClient();
    this.encryptor = new SimpleCrypto(repoPublicKey);
  }

  static access = async function (token: string): Promise<SimpleCache> {
    if (!SimpleCache.__instance) {
      await SimpleCache.initialize(token)
        .then((instance: SimpleCache) => SimpleCache.__instance = instance);
    }
    return SimpleCache.__instance as SimpleCache;
  }

  static initialize = async (token: string): Promise<SimpleCache> => {
    core.info(SimpleCrypto.toString())
    const authenticatedAPI = getOctokit(token).rest
    core.info('Successfully authenticated with GitHub API');
    return await authenticatedAPI.actions.getRepoPublicKey({
      owner: context.repo.owner,
      repo: context.repo.repo,
    })
      .then(({data}) => {
        core.info(`Successfully retrieved repo public key`);
        core.info(`Repo public key: ${data.key}`);
        core.info(`Repo public key id: ${data.key_id}`);
        return new SimpleCache(authenticatedAPI, data.key, data.key_id);
      })
      .catch((error) => {
        throw new Error(`Unable to initialize SimpleCache: ${error}`);
      })
  };

  load = async function (this: SimpleCache, tag: string): Promise<string> {
    return await this.artifactClient.downloadArtifact(tag, '/tmp')
      .then(async ({downloadPath}: {downloadPath: string}) => {
        console.log(`Downloaded artifact to ${downloadPath}`);
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
      .then(() => console.log(`Cached value for ${tag}: ${value}`))
      .then(async () => await this.artifactClient.uploadArtifact(tag, [tag], '/tmp')
        .then(() => console.log(`Uploaded artifact for ${tag}`)).then(() => true))
        .catch((error) => {
          console.log(`Unable to cache ${tag}: ${error}`);
          return false;
        }
      );
  };

  encrypt = function (this: SimpleCache, message: string): string {
    return this.encryptor.encrypt(message) as string;
  };

}

export default SimpleCache;
