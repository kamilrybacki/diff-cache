import core from '@actions/core';
import TriggeredWorkflow from './src/workflow';

export const prerun = async () => {
  const token = core.getInput('token');
  TriggeredWorkflow.auth(token)
    .then(async (workflow: TriggeredWorkflow) => {
      const workflowData = await workflow.data;
      core.info(`Workflow path: ${workflowData.path}`);
      core.info(`Workflow content: ${workflowData.content}`);
    }
  );
};
