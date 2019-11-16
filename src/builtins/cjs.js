// nodebowl Modified based on Node.js 12
// 
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
import vm from 'vm';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import * as builtinModulesMap from '..';
import debugModule from 'debug';

const debug = debugModule('module');

function getBuiltinModule(name) {
  // use fs
  return builtinModulesMap[name];
}

function cjs(cwd, argv, env) {
  process.cwd = () => {
    return cwd || '/';
  };
  process.stderr = {};
  process.argv = argv || ['/usr/local/bin/node'];
  process.env = process.env || {};
  if (env) {
    Object.keys(env).forEach(item => {
      process.env[item] = env[item];
    });
  }

  const SafeMap = Map;

  function internalModuleReadJSON(filename) {
    try {
      const json = fs.readFileSync(filename, 'utf8');
      return json;
    } catch (err) {
    }
  }

  function internalModuleStat(filename) {
    try {
      const stat = fs.statSync(filename);
      return stat.isDirectory() ? 1 : 0
    } catch (err) {
      return -1
    }
  }

  // Invoke with makeRequireFunction(module) where |module| is the Module object
  // to use as the context for the require() function.
  function makeRequireFunction(mod) {
    const Module = mod.constructor;

    function require(path) {
      return mod.require(path);
    };

    function resolve(request, options) {
      validateString(request, 'request');
      return Module._resolveFilename(request, mod, false, options);
    }

    require.resolve = resolve;

    function paths(request) {
      validateString(request, 'request');
      return Module._resolveLookupPaths(request, mod);
    }

    resolve.paths = paths;

    require.main = process.mainModule;

    // Enable support to add extra extension types.
    require.extensions = Module._extensions;

    require.cache = Module._cache;

    return require;
  }

  function stripBOM(content) {
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    return content;
  }

  function createError() {
    return class extends Error {
      constructor() {
        super(); 
      }
    };
  };

  // TODO bettr errors
  const ERR_INVALID_ARG_VALUE = createError();
  const ERR_INVALID_OPT_VALUE = createError();
  const ERR_REQUIRE_ESM = createError();
  const ERR_INVALID_ARG_TYPE = createError();


  function validateString(value, name) {
    if (typeof value !== 'string')
      throw new ERR_INVALID_ARG_TYPE(name, 'string', value);
  }

  const CHAR_FORWARD_SLASH =  47; /* / */

  const relativeResolveCache = Object.create(null);

  let requireDepth = 0;
  let statCache = null;

  function stat(filename) {
    if (statCache !== null) {
      const result = statCache.get(filename);
      if (result !== undefined) return result;
    }
    const result = internalModuleStat(filename);
    if (statCache !== null) statCache.set(filename, result);
    return result;
  }

  function updateChildren(parent, child, scan) {
    const children = parent && parent.children;
    if (children && !(scan && children.includes(child)))
      children.push(child);
  }

  function Module(id = '', parent) {
    this.id = id;
    this.path = path.dirname(id);
    this.exports = {};
    this.parent = parent;
    updateChildren(parent, this, false);
    this.filename = null;
    this.loaded = false;
    this.children = [];
  }


  Module._cache = Object.create(null);
  Module._pathCache = Object.create(null);
  Module._extensions = Object.create(null);
  var modulePaths = [];
  Module.globalPaths = [];

  let patched = false;

  // eslint-disable-next-line func-style
  let wrap = function(script) {
    return Module.wrapper[0] + script + Module.wrapper[1];
  };

  const wrapper = [
    '(function (exports, require, module, __filename, __dirname) { ',
    '\n});'
  ];

  let wrapperProxy = new Proxy(wrapper, {
    set(target, property, value, receiver) {
      patched = true;
      return Reflect.set(target, property, value, receiver);
    },

    defineProperty(target, property, descriptor) {
      patched = true;
      return Object.defineProperty(target, property, descriptor);
    }
  });

  Object.defineProperty(Module, 'wrap', {
    get() {
      return wrap;
    },

    set(value) {
      patched = true;
      wrap = value;
    }
  });

  Object.defineProperty(Module, 'wrapper', {
    get() {
      return wrapperProxy;
    },

    set(value) {
      patched = true;
      wrapperProxy = value;
    }
  });

  // Given a module name, and a list of paths to test, returns the first
  // matching file in the following precedence.
  //
  // require("a.<ext>")
  //   -> a.<ext>
  //
  // require("a")
  //   -> a
  //   -> a.<ext>
  //   -> a/index.<ext>

  const packageJsonCache = new SafeMap();

  function readPackage(requestPath) {
    const jsonPath = path.resolve(requestPath, 'package.json');

    const existing = packageJsonCache.get(jsonPath);
    if (existing !== undefined) return existing;

    const json = internalModuleReadJSON(jsonPath);
    if (json === undefined) {
      packageJsonCache.set(jsonPath, false);
      return false;
    }

    try {
      const parsed = JSON.parse(json);
      const filtered = {
        main: parsed.main,
        exports: parsed.exports,
        type: parsed.type
      };
      packageJsonCache.set(jsonPath, filtered);
      return filtered;
    } catch (e) {
      e.path = jsonPath;
      e.message = 'Error parsing ' + jsonPath + ': ' + e.message;
      throw e;
    }
  }

  function readPackageScope(checkPath) {
    const rootSeparatorIndex = checkPath.indexOf(path.sep);
    let separatorIndex;
    while (
      (separatorIndex = checkPath.lastIndexOf(path.sep)) > rootSeparatorIndex
    ) {
      checkPath = checkPath.slice(0, separatorIndex);
      if (checkPath.endsWith(path.sep + 'node_modules'))
        return false;
      const pjson = readPackage(checkPath);
      if (pjson) return pjson;
    }
    return false;
  }

  function readPackageMain(requestPath) {
    const pkg = readPackage(requestPath);
    return pkg ? pkg.main : undefined;
  }

  function tryPackage(requestPath, exts, isMain, originalPath) {
    const pkg = readPackageMain(requestPath);

    if (!pkg) {
      return tryExtensions(path.resolve(requestPath, 'index'), exts, isMain);
    }

    const filename = path.resolve(requestPath, pkg);
    let actual = tryFile(filename, isMain) ||
      tryExtensions(filename, exts, isMain) ||
      tryExtensions(path.resolve(filename, 'index'), exts, isMain);
    if (actual === false) {
      actual = tryExtensions(path.resolve(requestPath, 'index'), exts, isMain);
      if (!actual) {
        // eslint-disable-next-line no-restricted-syntax
        const err = new Error(
          `Cannot find module '${filename}'. ` +
          'Please verify that the package.json has a valid "main" entry'
        );
        err.code = 'MODULE_NOT_FOUND';
        err.path = path.resolve(requestPath, 'package.json');
        err.requestPath = originalPath;
        // TODO(BridgeAR): Add the requireStack as well.
        throw err;
      }
    }
    return actual;
  }

  // In order to minimize unnecessary lstat() calls,
  // this cache is a list of known-real paths.
  // Set to an empty Map to reset.
  const realpathCache = new Map();

  // Check if the file exists and is not a directory
  // if using --preserve-symlinks and isMain is false,
  // keep symlinks intact, otherwise resolve to the
  // absolute realpath.
  function tryFile(requestPath, isMain) {
    const rc = stat(requestPath);
    return rc === 0 && toRealPath(requestPath);
  }

  function toRealPath(requestPath) {
    return fs.realpathSync(requestPath);
  }

  // Given a path, check if the file exists with any of the set extensions
  function tryExtensions(p, exts, isMain) {
    for (var i = 0; i < exts.length; i++) {
      const filename = tryFile(p + exts[i], isMain);

      if (filename) {
        return filename;
      }
    }
    return false;
  }

  // Find the longest (possibly multi-dot) extension registered in
  // Module._extensions
  function findLongestRegisteredExtension(filename) {
    const name = path.basename(filename);
    let currentExtension;
    let index;
    let startIndex = 0;
    while ((index = name.indexOf('.', startIndex)) !== -1) {
      startIndex = index + 1;
      if (index === 0) continue; // Skip dotfiles like .gitignore
      currentExtension = name.slice(index);
      if (Module._extensions[currentExtension]) return currentExtension;
    }
    return '.js';
  }

  function resolveExports(nmPath, request, absoluteRequest) { 
    return path.resolve(nmPath, request);
  }

  Module._findPath = function(request, paths, isMain) {
    const absoluteRequest = path.isAbsolute(request);
    if (absoluteRequest) {
      paths = [''];
    } else if (!paths || paths.length === 0) {
      return false;
    }

    const cacheKey = request + '\x00' +
                  (paths.length === 1 ? paths[0] : paths.join('\x00'));
    const entry = Module._pathCache[cacheKey];
    if (entry)
      return entry;

    var exts;
    var trailingSlash = request.length > 0 &&
      request.charCodeAt(request.length - 1) === CHAR_FORWARD_SLASH;
    if (!trailingSlash) {
      trailingSlash = /(?:^|\/)\.?\.$/.test(request);
    }

    // For each path
    for (var i = 0; i < paths.length; i++) {
      // Don't search further if path doesn't exist
      const curPath = paths[i];
      if (curPath && stat(curPath) < 1) continue;
      var basePath = resolveExports(curPath, request, absoluteRequest);
      var filename;

      var rc = stat(basePath);
      if (!trailingSlash) {
        if (rc === 0) {  // File.
          if (!isMain) {
            filename = toRealPath(basePath);
          } else {
            filename = toRealPath(basePath);
          }
        }

        if (!filename) {
          // Try it with each of the extensions
          if (exts === undefined)
            exts = Object.keys(Module._extensions);
          filename = tryExtensions(basePath, exts, isMain);
        }
      }

      if (!filename && rc === 1) {  // Directory.
        // try it with each of the extensions at "index"
        if (exts === undefined)
          exts = Object.keys(Module._extensions);
        filename = tryPackage(basePath, exts, isMain, request);
      }

      if (filename) {
        Module._pathCache[cacheKey] = filename;
        return filename;
      }
    }
    return false;
  };

  // 'node_modules' character codes reversed
  const nmChars = [ 115, 101, 108, 117, 100, 111, 109, 95, 101, 100, 111, 110 ];
  const nmLen = nmChars.length;
  Module._nodeModulePaths = function(from) {
    // Guarantee that 'from' is absolute.
    from = path.resolve(from);
    // Return early not only to avoid unnecessary work, but to *avoid* returning
    // an array of two items for a root: [ '//node_modules', '/node_modules' ]
    if (from === '/')
      return ['/node_modules'];

    // note: this approach *only* works when the path is guaranteed
    // to be absolute.  Doing a fully-edge-case-correct path.split
    // that works on both Windows and Posix is non-trivial.
    const paths = [];
    var p = 0;
    var last = from.length;
    for (var i = from.length - 1; i >= 0; --i) {
      const code = from.charCodeAt(i);
      if (code === CHAR_FORWARD_SLASH) {
        if (p !== nmLen)
          paths.push(from.slice(0, last) + '/node_modules');
        last = i;
        p = 0;
      } else if (p !== -1) {
        if (nmChars[p] === code) {
          ++p;
        } else {
          p = -1;
        }
      }
    }

    // Append /node_modules to handle root paths.
    paths.push('/node_modules');

    return paths;
  };

  Module._resolveLookupPaths = function(request, parent) {
    if (getBuiltinModule(request)) {
      debug('looking for %j in []', request);
      return null;
    }

    // Check for node modules paths.
    if (request.charAt(0) !== '.' ||
        (request.length > 1 &&
        request.charAt(1) !== '.' &&
        request.charAt(1) !== '/')) {

      let paths = modulePaths;
      if (parent != null && parent.paths && parent.paths.length) {
        paths = parent.paths.concat(paths);
      }

      debug('looking for %j in %j', request, paths);
      return paths.length > 0 ? paths : null;
    }

    // With --eval, parent.id is not set and parent.filename is null.
    if (!parent || !parent.id || !parent.filename) {
      // Make require('./path/to/foo') work - normally the path is taken
      // from realpath(__filename) but with eval there is no filename
      const mainPaths = ['.'].concat(Module._nodeModulePaths('.'), modulePaths);

      debug('looking for %j in %j', request, mainPaths);
      return mainPaths;
    }

    debug('RELATIVE: requested: %s from parent.id %s', request, parent.id);

    const parentDir = [path.dirname(parent.filename)];
    debug('looking for %j', parentDir);
    return parentDir;
  };

  // Check the cache for the requested file.
  // 1. If a module already exists in the cache: return its exports object.
  // 2. If the module is native: call
  //    `NativeModule.prototype.compileForPublicLoader()` and return the exports.
  // 3. Otherwise, create a new module for the file and save it to the cache.
  //    Then have it load  the file contents before returning its exports
  //    object.
  Module._load = function(request, parent, isMain) {
    let relResolveCacheIdentifier;
    if (parent) {
      debug('Module._load REQUEST %s parent: %s', request, parent.id);
      // Fast path for (lazy loaded) modules in the same directory. The indirect
      // caching is required to allow cache invalidation without changing the old
      // cache key names.
      relResolveCacheIdentifier = `${parent.path}\x00${request}`;
      const filename = relativeResolveCache[relResolveCacheIdentifier];
      if (filename !== undefined) {
        const cachedModule = Module._cache[filename];
        if (cachedModule !== undefined) {
          updateChildren(parent, cachedModule, true);
          return cachedModule.exports;
        }
        delete relativeResolveCache[relResolveCacheIdentifier];
      }
    }

    const filename = Module._resolveFilename(request, parent, isMain);

    const cachedModule = Module._cache[filename];
    if (cachedModule !== undefined) {
      updateChildren(parent, cachedModule, true);
      return cachedModule.exports;
    }

    const builtinModule = getBuiltinModule(request);
    if (builtinModule) {
      return builtinModule;
    }

    // Don't call updateChildren(), Module constructor already does.
    const module = new Module(filename, parent);

    if (isMain) {
      process.mainModule = module;
      module.id = '.';
    }

    Module._cache[filename] = module;
    if (parent !== undefined) {
      relativeResolveCache[relResolveCacheIdentifier] = filename;
    }

    let threw = true;
    try {
      module.load(filename);
      threw = false;
    } finally {
      if (threw) {
        delete Module._cache[filename];
        if (parent !== undefined) {
          delete relativeResolveCache[relResolveCacheIdentifier];
        }
      }
    }

    return module.exports;
  };

  Module._resolveFilename = function(request, parent, isMain, options) {
    if (getBuiltinModule(request)) {
      return request;
    }

    var paths;

    if (typeof options === 'object' && options !== null) {
      if (Array.isArray(options.paths)) {
        const isRelative = request.startsWith('./') ||
            request.startsWith('../');

        if (isRelative) {
          paths = options.paths;
        } else {
          const fakeParent = new Module('', null);

          paths = [];

          for (var i = 0; i < options.paths.length; i++) {
            const path = options.paths[i];
            fakeParent.paths = Module._nodeModulePaths(path);
            const lookupPaths = Module._resolveLookupPaths(request, fakeParent);

            for (var j = 0; j < lookupPaths.length; j++) {
              if (!paths.includes(lookupPaths[j]))
                paths.push(lookupPaths[j]);
            }
          }
        }
      } else if (options.paths === undefined) {
        paths = Module._resolveLookupPaths(request, parent);
      } else {
        throw new ERR_INVALID_OPT_VALUE('options.paths', options.paths);
      }
    } else {
      paths = Module._resolveLookupPaths(request, parent);
    }

    // Look up the filename first, since that's the cache key.
    const filename = Module._findPath(request, paths, isMain);
    if (!filename) {
      const requireStack = [];
      for (var cursor = parent;
        cursor;
        cursor = cursor.parent) {
        requireStack.push(cursor.filename || cursor.id);
      }
      let message = `Cannot find module '${request}'`;
      if (requireStack.length > 0) {
        message = message + '\nRequire stack:\n- ' + requireStack.join('\n- ');
      }
      // eslint-disable-next-line no-restricted-syntax
      var err = new Error(message);
      err.code = 'MODULE_NOT_FOUND';
      err.requireStack = requireStack;
      throw err;
    }
    return filename;
  };


  // Given a file name, pass it to the proper extension handler.
  Module.prototype.load = function(filename) {
    debug('load %j for module %j', filename, this.id);

    assert(!this.loaded);
    this.filename = filename;
    this.paths = Module._nodeModulePaths(path.dirname(filename));

    const extension = findLongestRegisteredExtension(filename);
    Module._extensions[extension](this, filename);
    this.loaded = true;

  };


  // Loads a module at the given file path. Returns that module's
  // `exports` property.
  Module.prototype.require = function(id) {
    validateString(id, 'id');
    if (id === '') {
      throw new ERR_INVALID_ARG_VALUE('id', id,
                                      'must be a non-empty string');
    }
    requireDepth++;
    try {
      return Module._load(id, this, /* isMain */ false);
    } finally {
      requireDepth--;
    }
  };


  function wrapSafe(filename, content) {
    if (patched) {
      const wrapper = Module.wrap(content);
      return vm.runInThisContext(wrapper, {
        filename,
        lineOffset: 0,
        displayErrors: true,
      });
    }
    try {
      // exports, require, module, filename, dirname
      const compiledFunction = new Function(
        'exports',
        'require',
        'module',
        '__filename',
        '__dirname',
        'process',
        'global',
        `
        // ${filename}

        ${content}
        `
      );
      return compiledFunction;
    } catch (err) {
      throw err;
    }
  }

  // Run the file contents in the correct scope or sandbox. Expose
  // the correct helper variables (require, module, exports) to
  // the file.
  // Returns exception, if any.
  Module.prototype._compile = function(content, filename) {

    const compiledWrapper = wrapSafe(filename, content, this);

    const dirname = path.dirname(filename);
    const require = makeRequireFunction(this);
    var result;
    const exports = this.exports;
    const thisValue = exports;
    const module = this;
    if (requireDepth === 0) statCache = new Map();
    
    // TODO nodebowl not use window.Buffer
    window.Buffer = builtinModulesMap['buffer'].Buffer;
    try {
      result = compiledWrapper.call(thisValue, exports, require, module,
        filename, dirname, process, global);
    } catch (err) {
      console.log(`error compiled ${filename}`);
      throw err;
    }
    
    if (requireDepth === 0) statCache = null;
    return result;
  };


  // Native extension for .js
  Module._extensions['.js'] = function(module, filename) {
    if (filename.endsWith('.js')) {
      const pkg = readPackageScope(filename);
      if (pkg && pkg.type === 'module') {
        throw new ERR_REQUIRE_ESM(filename);
      }
    }
    const content = fs.readFileSync(filename, 'utf8');
    module._compile(content, filename);
  };


  // Native extension for .json
  Module._extensions['.json'] = function(module, filename) {
    const content = fs.readFileSync(filename, 'utf8');

    try {
      module.exports = JSON.parse(stripBOM(content));
    } catch (err) {
      err.message = filename + ': ' + err.message;
      throw err;
    }
  };

  // Bootstrap main module.
  Module.runMain = function() {
    // Load the main module--the command line argument.
    Module._load(process.argv[1], null, true);
  };

  function createRequireFromPath(filename) {
    // Allow a directory to be passed as the filename
    const trailingSlash =
      filename.endsWith('/');

    const proxyPath = trailingSlash ?
      path.join(filename, 'noop.js') :
      filename;

    const m = new Module(proxyPath);
    m.filename = proxyPath;

    m.paths = Module._nodeModulePaths(m.path);
    return makeRequireFunction(m, null);
  }

  const createRequireError = 'must be a file URL object, file URL string, or ' +
    'absolute path string';

  function createRequire(filename) {
    let filepath;

    if (typeof filename !== 'string') {
      throw new ERR_INVALID_ARG_VALUE('filename', filename, createRequireError);
    } else {
      filepath = filename;
    }
    return createRequireFromPath(filepath);
  }

  Module.createRequire = createRequire;
  return Module;
}

export default cjs;

