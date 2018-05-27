#!/usr/bin/env node

const _ = require('lodash');
const chalk = require('chalk');
const child_process = require('child_process');
const debug = require('debug');
const P = require('bluebird');
const program = require('commander');
const util = require('util');

const dlog = debug('gitreview:main');

program
  .description('Review the current topic branch by files changed per commit')
  .usage('[options]')
  .option('-b, --branch [commitish]', 'The commitish the topic branch was created from [master]', 'master')
  .option('-a, --abbrev [digits]', 'Abbreviate commit hashes to the number of digits', '8')
  .option('-f, --by-file', 'Also output summary by file of files with multiple commits')
  .parse(process.argv);

function forward({out, err}) {
  if (!_.isEmpty(out)) {
    process.stdout.write(out);
  }
  if (!_.isEmpty(err)) {
    process.stderr.write(chalk.red(err));
  }
}
async function exec(command) {
  dlog(`exec command "${command}"`);
  const execP = util.promisify(child_process.exec);
  const {stdout, stderr} = await execP(command);
  dlog('exec stdout:', stdout);
  dlog('exec stderr:', stderr);
  return {out: stdout, err: stderr};
}

async function doGitReview() {
  const refbranch = program.branch;
  const abbrev = program.abbrev;
  const command = `git log --oneline --reverse --name-only --abbrev=${abbrev} ${refbranch}..HEAD`;
  const {out, err} = await exec(command);
  forward({err});
  return out.split('\n');
}

const INDENT = '    ';

function analyze(lines) {
  const index = {};

  const s = `^([0-9a-f]{${program.abbrev}})\\s+(.*)$`;
  const r = new RegExp(s);

  let commit = null;
  _.each(lines, (line) => {
    const m = r.exec(line);
    if (m) {
      commit = m[1];
      const title = m[2];
      console.log(chalk.bold(`${commit}  ${title}`));
    } else {
      console.log(INDENT + line);
      if (!index[line]) {
        index[line] = [ commit ];
      } else {
        index[line].push(commit);
      }
    }
  });

  if (program.byFile) {
    console.log();
    const files = _.sortBy(_.keys(index));
    _.each(files, (file) => {
      const commits = index[file];
      if (commits.length > 1) {
        console.log(chalk.bold(file));
        _.each(commits, (commit) => console.log(INDENT + commit));
      }
    });
  }
}

doGitReview()
  .then((lines) => analyze(lines));
