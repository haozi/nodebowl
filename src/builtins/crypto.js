import createHash from 'create-hash';


const algorithm = [
  'md5',
  'rmd160',
  'ripemd160',
  'sha',
  'sha1',
  'sha224',
  'sha256',
  'sha384',
  'sha512'
];

// just support 2 functions
export default {
  getHashes() {
    return algorithm;
  },
  createHash(str) {
    if (algorithm.includes(str)) {
      return createHash(str);
    }
    return createHash('md5');
  }
};
