import * as core from '@actions/core';
import fs from 'fs/promises';
import {
  create as createArtifactClient,
  ArtifactClient
} from '@actions/artifact';
import { getOctokit, context } from '@actions/github';
import * as _sodium from 'libsodium-wrappers';
import concatTypedArray from 'concat-typed-array';

import { RestEndpointMethods } from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types';
import { RepoPublicKey } from './types';

class SimpleCache {
  repoPublicKey: string;
  repoPublicKeyId: string;
  artifactClient: ArtifactClient;
  authenticatedAPI: RestEndpointMethods;
  sodiumInstance: typeof _sodium;
  nonceBytes: number;
  private static __instance: SimpleCache | undefined = undefined;

  constructor(authenticatedAPI: RestEndpointMethods, repoPublicKey: string, repoPublicKeyId: string, sodiumInstance: typeof _sodium) {
    this.authenticatedAPI = authenticatedAPI;
    this.repoPublicKey = repoPublicKey;
    this.repoPublicKeyId = repoPublicKeyId;
    this.artifactClient = createArtifactClient();
    this.sodiumInstance = sodiumInstance;
    this.nonceBytes = sodiumInstance.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES;
  }

  static access = async function (): Promise<SimpleCache> {
    if (!SimpleCache.__instance) {
      await SimpleCache.initialize()
        .then((instance: SimpleCache) => SimpleCache.__instance = instance);
    }
    return SimpleCache.__instance as SimpleCache;
  }

  static initialize = async (): Promise<SimpleCache> => {
    const authenticatedAPI = getOctokit(process.env.GITHUB_TOKEN as string).rest
    core.info('Successfully authenticated with GitHub API');
    let keyData: RepoPublicKey = {key: '', key_id: ''};
    await authenticatedAPI.actions.getRepoPublicKey({
      owner: context.repo.owner,
      repo: context.repo.repo,
    })
      .then(({data}) => {
        core.info(`Successfully retrieved repo public key`);
        core.info(`Repo public key: ${data.key}`);
        core.info(`Repo public key id: ${data.key_id}`);
        keyData = data;
      })
      .catch((error) => {
        throw new Error(`Unable to retrieve repo public key: ${error}`);
      });
    await _sodium.ready;
    return new SimpleCache(authenticatedAPI, keyData.key, keyData.key_id, _sodium);
  };

  load = async function (this: SimpleCache, tag: string): Promise<string> {
    return await this.artifactClient.downloadArtifact(`STAGED_FILES_${tag.toUpperCase()}`, '/tmp')
      .then(async ({downloadPath}: {downloadPath: string}) => {
        console.log(`Downloaded artifact to ${downloadPath}`);
        return await fs.readFile(downloadPath, 'utf-8')
          .then((encryptedValue: string) => this.decrypt(encryptedValue))
      })
  };

  decrypt = function (this: SimpleCache, encrypted: string): string {
    core.info('Decrypting secret value');
    const encryptedMessageArray = new TextEncoder().encode(encrypted);
    const nonce = encryptedMessageArray.slice(0, this.nonceBytes);
    const message = encryptedMessageArray.slice(this.nonceBytes);
    core.info('Successfully decrypted secret value')
    return this.sodiumInstance.crypto_aead_xchacha20poly1305_ietf_decrypt(
      nonce, message, null, nonce, this.sodiumInstance.from_hex(this.repoPublicKey), "text"
    );
  };

  save = async function (this: SimpleCache, tag: string, value: string): Promise<boolean> {
    const uppercaseTag = tag.toUpperCase();
    const encryptedValue = this.encrypt(value);
    return await fs.writeFile(`/tmp/STAGED_FILES_${uppercaseTag}`, encryptedValue, 'utf-8')
      .then(() => console.log(`Cached value for ${tag}: ${value}`))
      .then(async () => await this.artifactClient.uploadArtifact(`STAGED_FILES_${uppercaseTag}`, [tag], '/tmp')
        .then(() => console.log(`Uploaded artifact for ${tag}`)).then(() => true))
        .catch((error) => {
          console.log(`Unable to cache ${tag}: ${error}`);
          return false;
        }
      );
  };

  encrypt = function (this: SimpleCache, message: string): string {
    const nonce = this.sodiumInstance.randombytes_buf(this.nonceBytes);
    const encryptedValue = this.sodiumInstance.crypto_aead_xchacha20poly1305_ietf_encrypt(
      message, null, nonce, nonce, this.sodiumInstance.from_hex(this.repoPublicKey)
    );
    const encryptedMessageArray: Uint8Array = concatTypedArray(Uint8Array, nonce, encryptedValue);
    core.info('Successfully encrypted secret value');
    return new TextDecoder().decode(encryptedMessageArray);
  };

}

export default SimpleCache;
