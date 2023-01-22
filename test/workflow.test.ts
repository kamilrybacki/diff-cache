import {describe, test, expect, beforeAll, beforeEach} from "@jest/globals";
import {getOctokit} from "@actions/github";
import {GitHub} from "@actions/github/lib/utils";
import {OctokitResponse} from "@octokit/types";
import TriggeredWorkflow from "../src/workflow";
import { WorkflowFileAPIEntryData, WorkflowFile } from './types';
import * as filesystem from 'fs/promises';

type EmojiResponse = OctokitResponse<{[key: string]: string}> | undefined

describe("Test workflow file reading", () => {
  const testsToken: string | undefined = process.env.TESTS_TOKEN;
  let authenticatedOctokit: InstanceType<typeof GitHub>;
  let workflowFile: WorkflowFile;

  const expectedWorkflowFilePath = ".github/workflows/test-functionality.yml";

  beforeAll(async () => {
    expect(testsToken).toBeDefined();
    authenticatedOctokit = getOctokit(testsToken as string);
  });

  beforeEach(async () => {
    workflowFile = TriggeredWorkflow.auth(testsToken as string);
  });

  test("Check if OctoKit API was authenticated correctly", async () => {
    expect(authenticatedOctokit).toBeDefined();
    expect(workflowFile).toBeDefined();

    const workflowFileEmojis: EmojiResponse = await workflowFile.api.rest.emojis.get();
    const octokitEmojis: EmojiResponse = await authenticatedOctokit?.rest.emojis.get();

    expect(workflowFileEmojis?.status).toBe(200);
    expect(octokitEmojis?.status).toBe(200);
    expect(workflowFileEmojis?.data).toEqual(octokitEmojis?.data);
  });

  describe("Check if it is possible to fetch workflow file contents", () => {
    let workflowFilePath: string;
    let currentCommitTree: WorkflowFileAPIEntryData[];

    beforeAll(async () => {
      workflowFilePath = await workflowFile.getTriggeredWorkflowFilePath();
      currentCommitTree = await workflowFile.getCurrentCommitTree();
      expect(workflowFilePath).toBeDefined();
      expect(currentCommitTree).toBeDefined();
    });

    test("Check if workflow file path is fetched correctly", async () => {
      expect(workflowFilePath).toBe(expectedWorkflowFilePath);
    });

    test("Check if current commit file tree is fetched correctly", async () => {
      expect(currentCommitTree.length).toBeGreaterThan(0);
      expect(currentCommitTree.filter(
        (tree) => tree.path === expectedWorkflowFilePath
      )).toBe(1);
    });

    test("Check if workflow file is fetched correctly", async () => {
      const fetcherFileContent = await workflowFile.findWorkflowFileContent(currentCommitTree, workflowFilePath);
      const filePathWithinTestContainer = `${process.env.GITHUB_WORKSPACE}/${expectedWorkflowFilePath}`;
      const fileContentReadByContainer = await filesystem.readFile(`${filePathWithinTestContainer}`, {encoding: 'utf-8'});
      expect(fetcherFileContent).toBe(fileContentReadByContainer);
    });
  })
});