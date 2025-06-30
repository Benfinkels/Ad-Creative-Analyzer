module.exports = {
  readFile: (path, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
    }
    if (callback) {
      const err = new Error('ENOENT: no such file or directory, open \'' + path + '\'');
      err.code = 'ENOENT';
      callback(err);
    }
  },
  readFileSync: (path, options) => {
    const err = new Error('ENOENT: no such file or directory, open \'' + path + '\'');
    err.code = 'ENOENT';
    throw err;
  },
};
