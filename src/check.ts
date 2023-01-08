import * as actionsConsole from './actionsConsole.js';
import { execSync } from 'child_process';

const diff = async (include: string, exclude: string): Promise<string> => {
  const diffCommand = `git fetch > /dev/null 2>&1 & git diff --name-only`;
  const findFilesCommand = `${diffCommand} | grep -E "${include}" | grep -vE "${exclude}"`;
  return new Promise<string>(() => execSync(findFilesCommand, { encoding: 'utf8' }));
};

const check = async (include: string, exclude: string): Promise<string> => {
  console.log(`Checking staged files for ${include} ${exclude ? `and excluding ${exclude}` : ''}`);
  return await diff(include, exclude)
    .catch((error) => {
      actionsConsole.fail(error.message);
      return error;
    })
    .then((files) => {
      actionsConsole.info(files)
      return files;
    })

};

export default check;
