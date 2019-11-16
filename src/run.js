import path from 'path';
import csj from './builtins/cjs';

function run(filename, args, options) {
  let realArgs = [];
  let realOptions;
  if (Array.isArray(args)) {
    realArgs = args;
    realOptions = options;
  } else {
    realOptions = args;
  }

  const { cwd = '/', env = {} } = realOptions || {};
  const realPath = path.resolve(cwd, filename);
  const argv = ['/usr/local/bin/node', realPath, ...realArgs];
  const Module = csj(cwd, argv, env);
  Module.runMain();
}

export default run;
