## nodebowl

<div align="center">

![nodebowl](https://user-images.githubusercontent.com/44191223/68775140-0301be00-0669-11ea-9728-339567f1347b.png)

Put node in a bowl.


`nodebowl` is a in-browser lib that emulates the Node.js API includes fs, require, etc. It can run many Node.js lib in browser,eg: webpack in browser.
</div>

---

> This project just started,please consider starring the project to show your ❤️ and support if you like it.

## Getting Started

```
$ npm install nodebowl
```

```html
<script src="node_modules/nodebowl/dist/nodebowl.js"></script>
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

or import it

```js
import nodebowl from 'nodebowl';

const { fs, run } = window.nodebowl;
```

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

#### Other API

Other API emulates Node.js API, includes: fs, path, etc...

Alternatively, you can use the require method just as you are using Node.js.


### Examples

- simple [examples/simple](https://github.com/nodebowl/nodebowl/examples/simple)
- webpack [examples/webpack](https://github.com/nodebowl/nodebowl/examples/webpack)

### Dev

```
$ yarn
$ yarn dev
$ open http://localhost:8080/examples/simple/index.html
```

### Contributors

Welcom issue and pr, more details will be explained later.