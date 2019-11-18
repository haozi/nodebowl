## nodebowl

<div align="center">

![nodebowl](https://user-images.githubusercontent.com/44191223/68775140-0301be00-0669-11ea-9728-339567f1347b.png)

Put node in a bowl.


`nodebowl` is a in-browser lib that emulates the Node.js API includes fs, require, etc. It can run many Node.js lib in browser,eg: webpack in browser.
</div>

---

> This project just started,please consider starring the project to show your ❤️ and support if you like it.

## Getting Started

```html
<script src="https://unpkg.com/nodebowl/dist/nodebowl.js"></script>
<script>
  const { fs, run } = window.nodebowl;
  fs.writeFileSync('/foo.js', `
    module.exports = 1;
  `);
  fs.writeFileSync('/index.js', `
    const num = require('./foo');
    console.log(num);
  `);
  run('/index.js');
</script>
```

or install and import it

```
$ npm install nodebowl
```

```js
import * as nodebowl from 'nodebowl';

const { fs, run } = nodebowl;
```

### Examples

- simple [code](https://github.com/nodebowl/nodebowl/tree/master/examples/simple) [demo](https://nodebowl.com/static/examples/simple.html)
- webpack [code](https://github.com/nodebowl/nodebowl/tree/master/examples/webpack) [demo](https://nodebowl.com/static/examples/webpack.html)

### API

#### run(file[, args][, options])

- `file` \<string\> The name or path of the executable file to run.

- `args` \<string[]\> List of string arguments.

- `options` \<object\>

  - `cwd` \<string\> Current working directory.Default: `/`
  - `env` \<object\>  Environment key-value pairs.

```js
run('index.js'); // node index.js

run('index.js', {
  env: {
    NODE_ENV: 'dev'
  }
}); // NODE_ENV=dev node ./index.js

run('./dir/index.js', ['--v']); // node ./dir/index.js --v
```

#### helpers.installFromZip(url)

- url \<string\> The zip url.

When you need to download the zip file like node_modules, you can use this helper method.

API emulates Node.js API:

#### fs

```js
const { fs } = nodebowl;
```

#### path

```js
const { path } = nodebowl;
```

#### os

```js
const { os } = nodebowl;
```

#### module

```js
const { module } = nodebowl;
```

#### constants

```js
const { constants } = nodebowl;
```

#### stream

```js
const { stream } = nodebowl;
```

#### buffer

```js
const { buffer } = nodebowl;
```

#### util

```js
const { util } = nodebowl;
```

#### events

```js
const { events } = nodebowl;
```

#### querystring

```js
const { querystring } = nodebowl;
```

#### punycode

```js
const { punycode } = nodebowl;
```

#### url

```js
const { url } = nodebowl;
```

#### http

```js
const { http } = nodebowl;
```

#### https

```js
const { https } = nodebowl;
```

#### assert

```js
const { assert } = nodebowl;
```

#### timers

```js
const { timers } = nodebowl;
```

#### console

```js
const { console } = nodebowl;
```

#### vm

```js
const { vm } = nodebowl;
```

#### zlib

```js
const { zlib } = nodebowl;
```

#### tty

```js
const { tty } = nodebowl;
```

#### domain

```js
const { domain } = nodebowl;
```

#### crypto

```js
const { crypto } = nodebowl;
```

Alternatively, you can use the `require` and `process` just as you are using Node.js.


### Dev

```
$ yarn
$ yarn dev
$ open http://localhost:8080/examples/simple/index.html
```

### Contributors

Welcome issue and pr, more details will be explained later.