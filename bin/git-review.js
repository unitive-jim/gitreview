#!/usr/bin/env node

const _ = require('lodash');
const chalk = require('chalk');
const child_process = require('child_process');
const debug = require('debug');
const P = require('bluebird');
const package = require('package-json-utils');
const program = require('commander');
const util = require('util');

const dlog = debug('gitreview:main');

function forward({out, err}) {
  if (!_.isEmpty(out)) {
    process.stdout.write(out);
  }
  if (!_.isEmpty(err)) {
    process.stderr.write(chalk.red(err));
  }
}

async function distanceTo(committish) {
  try {
    const command = `git cherry --abbrev ${committish} HEAD`;
    const {out, err} = await exec(command);
    const distance = out.trim().split('\n').length;
    dlog('Computed distance:', distance);
    return distance === 0 ? Number.POSITIVE_INFINITY : distance;
  } catch (e) {
    return Number.POSITIVE_INFINITY;
  }
}

// This function makes a best guess as to the nearest "epic" branch that
// the current branch likely was branched from.
function nearestEpic() {
  dlog('nearestEpic');
  const epics = ['master', 'develop', 'origin/master', 'origin/develop']; // TODO: consider adding others
  return P.reduce(epics, (best, committish) => {
    dlog('best:', best, 'committish:', committish);
    return distanceTo(committish)
    .then(d => {
      dlog(`${committish}: ${d}`);
      return d < best[1] ? [committish, d] : best;
    });
  }, [null, Number.POSITIVE_INFINITY])
  .then(best => best[0]);
}

async function parseArgs() {
  const parent = await nearestEpic();
  program
    .description('Review the current topic branch by files changed per commit')
    .version(package.getVersion())
    .usage('[options]')
    .option('-b, --branch [committish]', `The committish the topic branch was created from [${parent}]`, parent)
    .option('-f, --by-file', 'Also output summary by file of files with multiple commits')
    .parse(process.argv);
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
  const command = `git log --oneline --reverse --name-only --abbrev --decorate=short ${refbranch}~1..HEAD`;
  const {out, err} = await exec(command);
  forward({err});
  return out.split('\n');
}

const INDENT = '    ';

function analyze(lines) {
  const index = {};

  const s = `^([0-9a-f]+)\\s+(.*)$`;
  const r = new RegExp(s);

  let commit = null;
  _.each(lines, (line) => {
    const m = r.exec(line);
    if (m) {
      commit = m[1];
      const title = m[2];
      console.log(chalk.bold.blue(`${commit}  ${title}`));
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

async function main() {
  await parseArgs();
  const lines = await doGitReview()
  analyze(lines);
}

main();
