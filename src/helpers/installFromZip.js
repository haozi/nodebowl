// install node_modules zip
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';


function zip(url, options = {}) {
  const dir = options.dir || '/';
  const date = Date.now();
  let num;
  return fetch(url)
  .then(response => {
    num = Date.now() - date;
    console.log('fetch date', (num / 1000));
    return response.blob()
  })
  .then(JSZip.loadAsync)
  .then(async (zip) => {
    num = Date.now() - date;
    console.log('zip date', (num / 1000));
    const symbolList = [];
    const dirList = [];
    const fileList = [];

    const arr = Object.keys(zip.files).map(name => (async () => {
      const obj = zip.files[name];
      const realPath = path.resolve(dir, name);

      // dir
      if (obj.dir) {
        dirList.push({
          name: realPath,
        });
        return;
      }

      const content = await obj.async('string');

      if (content.startsWith('./') || content.startsWith('../')  || content.startsWith('_')) {
        symbolList.push({
          path: realPath,
          target: path.resolve(realPath, '../', content),
        });
        return;
      }
    
      fileList.push({
        name: realPath,
        content,
      });

    })());
    await Promise.all(arr);
    return {
      symbolList,
      dirList,
      fileList,
    };
  })
  .then(({
    symbolList,
    dirList,
    fileList,
  }) => {
    num = Date.now() - date;
    console.log('zip string', (num / 1000));
    dirList.forEach(item => {
      fs.mkdirSync(item.name);
    });
    fileList.forEach(item => {
      fs.writeFileSync(item.name, item.content);
    });
    symbolList.forEach(item => {
      fs.symlinkSync(item.target, item.path);
    });
    num = Date.now() - date;
    console.log('install all date', (num / 1000));
  });
}

export default zip;

