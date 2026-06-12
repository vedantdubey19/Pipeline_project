import chalk from 'chalk';

export const logger = {
  stage: (stageNum, message) => {
    console.log(`${chalk.blue(`[Stage ${stageNum}]`)} ${message}`);
  },
  success: (stageNum, message) => {
    console.log(`${chalk.green(`[Stage ${stageNum}]`)} ${chalk.green(message)}`);
  },
  skip: (stageNum, message) => {
    console.log(`${chalk.yellow(`[Stage ${stageNum}]`)} ${chalk.yellow(message)}`);
  },
  error: (message) => {
    console.error(`${chalk.red('[Error]')}   ${chalk.red(message)}`);
  },
  done: (message) => {
    console.log(`${chalk.green.bold('[Done]')}    ${chalk.green(message)}`);
  },
  info: (message) => {
    console.log(message);
  }
};
