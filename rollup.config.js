import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import nodeGlobals from 'rollup-plugin-node-globals';
import minify from 'rollup-plugin-babel-minify';
import builtins from './src/builtins/index.js';


function onwarn(warning) {
  if (warning.code !== 'CIRCULAR_DEPENDENCY') {
      console.error(`(!) ${warning.message}`);
  }
}

const plugins = [
  commonjs(),   
  builtins(),   
  nodeResolve({
    preferBuiltins: false,
    mainFields: ['browser', 'module', 'main'],
  }),
  nodeGlobals(),
  json(),
];

if (process.env.BUILD) {
  plugins.push(minify());
}
export default {
  onwarn,
  input: './src/index.js',
  output: {
    file: 'dist/nodebowl.js',
    format: 'umd',
    name: 'nodebowl'
  },
	plugins,
};