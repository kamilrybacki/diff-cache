import { getOctokit, context } from '@actions/github';
import { RestEndpointMethods } from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types';

class Secrets {
  authenticatedAPI: RestEndpointMethods;
  repoPublicKey: string;
  repoPublicKeyId: string;

  constructor(authenticatedAPI: RestEndpointMethods, repoPublicKey: string, repoPublicKeyId: string) {
    this.authenticatedAPI = authenticatedAPI;
    this.repoPublicKey = repoPublicKey;
    this.repoPublicKeyId = repoPublicKeyId;
  }

  static access = async (): Promise<Secrets> => {
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
    return new Secrets(authenticatedAPI, keyData.key, keyData.key_id);
  }

  static setSecret = (key: string, value: string) => {
    console.log(`Setting secret value for ${key}: ${value}`);
  };

  static getSecret = async (name: string): Promise<string> => {
    console.log(`Getting secret value for ${name}`);
    return '';
  }

  static decrypt = (value: string): string => {
    console.log(`Decrypting secret value: ${value}`);
    return '';
  }
}

export default Secrets;
