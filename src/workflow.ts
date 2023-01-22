import core from '@actions/core';
import {getOctokit, context} from '@actions/github';
import fetch from 'node-fetch';
import { WorkflowFileAPIEntryData, WorkflowFile } from './types';
import { GitHub } from '@actions/github/lib/utils';

class ActiveWorkflowFileReader {
  public data!: Promise<WorkflowFile>;
  api: InstanceType<typeof GitHub>;
  token: string;

  private __workflowData: WorkflowFile | undefined = undefined;
  private static __instance: ActiveWorkflowFileReader | undefined = undefined;

  constructor(
    api: InstanceType<typeof GitHub>,
    token: string,
  ) {
    this.api = api;
    this.token = token;
    Object.defineProperty(this, 'data', {
      get: async function (this: ActiveWorkflowFileReader): Promise<WorkflowFile> {
        if (!this.__workflowData) {
          const workflowPath = await this.getTriggeredWorkflowFilePath();
          const currentCommitTree = await this.getCurrentCommitTree();
          const workflowFileContent = await this.findWorkflowFileContent(currentCommitTree, workflowPath);
          this.__workflowData = {
            path: workflowPath,
            content: workflowFileContent,
          };
        }
        return this.__workflowData as WorkflowFile;
      }
    });
  }

  static auth = async function (token: string): Promise<ActiveWorkflowFileReader> {
    if (!ActiveWorkflowFileReader.__instance) {
      const authenticatedAPI = getOctokit(token);
      ActiveWorkflowFileReader.__instance = new ActiveWorkflowFileReader(authenticatedAPI, token);
    }
    return ActiveWorkflowFileReader.__instance as ActiveWorkflowFileReader;
  };

  getTriggeredWorkflowFilePath = async function (this: ActiveWorkflowFileReader): Promise<string> {
    return await this.api.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}', {
        owner: context.repo.owner,
        repo: context.repo.repo,
        run_id: context.runId,
      })
        .then(({data}) => {
          const currentWorkflowUrl = data.workflow_url;
          core.info(`Current workflow url: ${currentWorkflowUrl}`);
          return fetch(currentWorkflowUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              "Accept": "application/vnd.github+json",
              "Authorization": `Bearer ${this.token}`,
              "X-GitHub-Api-Version": "2022-11-28",
            },
            })
          })
        .catch((error: Error) => {
          throw new Error(`Unable to initialize SimpleCache: ${error.message}`);
        })
        .then((data) => data.json() as Promise<{path: string}>)
        .catch((error: Error) => {
          throw new Error(`Unable to format response: ${error.message}`);
        })
        .then(({path}) => path);
  };

  getCurrentCommitTree = async function (this: ActiveWorkflowFileReader): Promise<WorkflowFileAPIEntryData[]> {
    return await this.api.request('GET /repos/{owner}/{repo}/git/trees/{commit}?recursive=1', {
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
        });
  };

  findWorkflowFileContent = async function (this: ActiveWorkflowFileReader, tree: WorkflowFileAPIEntryData[], workflowFilePath: string): Promise<string> {
      const workflowFileEntry = tree.find((file: WorkflowFileAPIEntryData) => file.path === workflowFilePath);
      if (!workflowFileEntry) {
        throw new Error(`Unable to find workflow file in commit tree: ${workflowFilePath}`);
      }
      return await fetch(workflowFileEntry.url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          "Accept": "application/vnd.github+json",
          "Authorization": `Bearer ${this.token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      })
      .catch((error: Error) => {
        throw new Error(`Unable to fetch workflow file content: ${error.message}`);
      })
      .then((data) => data.json() as Promise<{content: string}>)
      .catch((error: Error) => {
        throw new Error(`Unable to format response: ${error.message}`);
      })
      .then(({content}) => Buffer.from(content, 'base64').toString('utf-8'))
      .catch((error: Error) => {
        throw new Error(`Unable to decode workflow file content: ${error.message}`);
      });
  };
}

export default ActiveWorkflowFileReader;
