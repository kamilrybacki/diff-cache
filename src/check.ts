import { execSync } from 'child_process';

const check = async (include: string, exclude: string): Promise<string> => {
  console.log(`Checking staged files for ${include} and excluding ${exclude}`);
  const diffCommand = `git diff HEAD^ HEAD --cached --name-only --diff-filter=ACMRTUXB`;
  const findFilesCommand = `${diffCommand} | grep -E "${include}" | grep -vE "${exclude}"`;
  const files = execSync(findFilesCommand).toString();
  console.log(files)
  return '';
};

export default check;
