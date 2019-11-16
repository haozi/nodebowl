import fs from './builtins/fs';
import os from './builtins/os';
import path from 'path-browserify';
import cjs from './builtins/cjs';
import constants from './builtins/constants';
import stream from './builtins/stream';
import * as buffer from 'buffer-es6';
import util from './builtins/util';
import events from './builtins/events';
import querystring from './builtins/qs';
import punycode from './builtins/punycode';
import url from './builtins/util';
import http from './builtins/http';
import https from './builtins/http';
import assert from './builtins/assert';
import timers from './builtins/timers';
import console from './builtins/console';
import vm from './builtins/vm';
import zlib from './builtins/zlib';
import tty from './builtins/tty';
import domain from 'domain-browser';
import crypto from './builtins/crypto';
import run from './run';
import helpers from './helpers';
import child_process from './builtins/child_process';
import { vol } from 'memfs-nodebowl';

// env /tmp
fs.mkdirSync('/tmp');

const module = cjs();

export {
  fs,
  vol,
  os,
  path,
  module,
  constants,
  stream,
  buffer,
  util,
  events,
  querystring,
  punycode,
  url,
  http,
  https,
  assert,
  timers,
  console,
  vm,
  zlib,
  tty,
  domain,
  crypto,
  child_process,
  run,
  helpers,
};
