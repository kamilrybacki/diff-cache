import fs from 'fs/promises';
import { downloadArtifact, uploadArtifact } from '@actions/artifact';
import { getOctokit, context } from '@actions/github';
import { RestEndpointMethods } from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types';

class StagedFilesCache {
  authenticatedAPI: RestEndpointMethods;
  repoPublicKey: string;
  repoPublicKeyId: string;

  constructor(authenticatedAPI: RestEndpointMethods, repoPublicKey: string, repoPublicKeyId: string) {
    this.authenticatedAPI = authenticatedAPI;
    this.repoPublicKey = repoPublicKey;
    this.repoPublicKeyId = repoPublicKeyId;
  }

  static access = async (): Promise<StagedFilesCache> => {
    const authenticatedAPI = getOctokit(process.env.GITHUB_TOKEN as string).rest
    let keyData: {
      key: string;
      key_id: string;
    } = {key: '', key_id: ''};
    await authenticatedAPI.actions.getRepoPublicKey({
      owner: context.repo.owner,
      repo: context.repo.repo,
    })
      .then(({data}) => keyData = data)
      .catch((error) => {
        throw new Error(`Unable to retrieve repo public key: ${error}`);
      });
    return new StagedFilesCache(authenticatedAPI, keyData.key, keyData.key_id);
  }

  static load = async (tag: string): Promise<string> => {
    return await downloadArtifact(`STAGED_FILES_${tag.toUpperCase()}`, '/tmp')
      .then(async ({downloadPath}: {downloadPath: string}) => {
        console.log(`Downloaded artifact to ${downloadPath}`);
        return await fs.readFile(downloadPath, 'utf-8')
          .then((encryptedValue: string) => this.decrypt(encryptedValue))
      })
  };

  static save = async (tag: string, value: string) => {
    const uppercaseTag = tag.toUpperCase();
    const encryptedValue = this.encrypt(value);
    await fs.writeFile(`/tmp/STAGED_FILES_${uppercaseTag}`, encryptedValue, 'utf-8')
      .then(() => console.log(`Saved secret value for ${tag}: ${value}`))
      .then(async () => await uploadArtifact(`STAGED_FILES_${uppercaseTag}`, [tag], '/tmp')
        .then(() => console.log(`Uploaded artifact for ${tag}`)))
  }

  static encrypt = (raw_value: string): string => {
    console.log(`Encrypting secret value: ${raw_value}`);
    return '';
  }

  static decrypt = (encrypted_value: string): string => {
    console.log(`Decrypting secret value: ${encrypted_value}`);
    return '';
  }
}

export default StagedFilesCache;
