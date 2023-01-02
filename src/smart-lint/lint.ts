
const validateLintCommand = async () => {
  console.log('Validating lint command');
};

const runLintCommand = async () => {
  console.log('Running lint command');
};

const lint = async (command: string, flags: string, files: string) => {
  console.log(`Linting files: ${files}`);
  console.log(`Linting command: ${command}`);
  console.log(`Linting flags: ${flags}`);
  await validateLintCommand().then(() => {
    runLintCommand();
  });
};

export default lint;
