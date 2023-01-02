// const sodium = require('tweetsodium');
// const github = require('@actions/github');

const check = async (include: string, exclude: string): Promise<string> => {
  console.log(`Checking staged files for ${include} and excluding ${exclude}`);
  return '';
};

const update = async (files: string) => {
  console.log(`Updating staged files: ${files}`);
};

export {check, update};
