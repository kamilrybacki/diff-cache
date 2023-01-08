import { execSync } from 'child_process';

const check = async (include: string, exclude: string): Promise<string> => {
  console.log(`Checking staged files for ${include} and excluding ${exclude}`);
  const files = execSync(`git diff HEAD^ HEAD`).toString();
  console.log(files)
  return '';
};

export default check;
