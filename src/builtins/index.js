// nodebowl Modified based on https://github.com/calvinmetcalf/rollup-plugin-node-builtins
import {join} from 'path';

const libs = new Map();

libs.set('process', require.resolve('process-es6'));
libs.set('buffer', require.resolve('buffer-es6'));
libs.set('util', require.resolve(join(__dirname, 'src/builtins', 'util')));
libs.set('events', require.resolve(join(__dirname, 'src/builtins', 'events')));
libs.set('stream', require.resolve(join(__dirname, 'src/builtins', 'stream')));
libs.set('path', require.resolve('path-browserify'));
libs.set('querystring', require.resolve(join(__dirname, 'src/builtins', 'qs')));
libs.set('punycode', require.resolve(join(__dirname, 'src/builtins', 'punycode')));
libs.set('url', require.resolve(join(__dirname, 'src/builtins', 'url')));
libs.set('assert', require.resolve(join(__dirname, 'src/builtins', 'assert')));
libs.set('_stream_duplex', require.resolve(join(__dirname, 'src/builtins', 'readable-stream', 'duplex')));
libs.set('_stream_passthrough', require.resolve(join(__dirname, 'src/builtins', 'readable-stream', 'passthrough')));
libs.set('_stream_readable', require.resolve(join(__dirname, 'src/builtins', 'readable-stream', 'readable')));
libs.set('_stream_writable', require.resolve(join(__dirname, 'src/builtins', 'readable-stream', 'writable')));
libs.set('_stream_transform', require.resolve(join(__dirname, 'src/builtins', 'readable-stream', 'transform')));
libs.set('vm', require.resolve(join(__dirname, 'src/builtins', 'vm')));
libs.set('fs', require.resolve(join(__dirname, 'src/builtins', 'fs')));

export default function () {
  return {resolveId(importee) {
    if (libs.has(importee)) {
      return libs.get(importee);
    }
  }};
}
