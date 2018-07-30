const renderToHugo = require('./render-schema-to-hugo'),
  config = require('./../config'),
  fs = require('fs-extra'),
  fsex = require('fs.extra'),
  bar = require(__dirname + '/../../progressBar/bar');

function init() {
  fsex.readFile(__dirname + '/../tmp/md-data.json', (err, data) => {
    if (err) throw err;
    config.MD_DATA = JSON.parse(data);
  });

  const loc = './../output';

  var removeDir = new Promise((resolve, reject) =>
    fsex.rmrf(loc, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve('ok');
      }
    })
  );
  removeDir.then(res => {
    try {
      fsex.mkdirpSync(loc);
      fsex.mkdirpSync(`${loc}/objects`);
      fsex.mkdirpSync(`${loc}/schema`);
      fsex.mkdirpSync(`${loc}/inputobjects`);
      fsex.mkdirpSync(`${loc}/interfaces`);
      fsex.mkdirpSync(`${loc}/enums`);
      fsex.mkdirpSync(`${loc}/scalars`);
    } catch (e) {
      throw e;
    }

    fs.readFile(__dirname + '/../tmp/introspection.json', (err, data) => {
      if (err) throw err;
      const parsedData = JSON.parse(data);
      bar.tick();
      renderToHugo(parsedData);
    });
  });
}

module.exports = {
  init
};
