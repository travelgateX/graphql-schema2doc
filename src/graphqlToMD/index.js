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

  const loc = `${__dirname}/../output`;

  return new Promise((resolve, reject) => {
    fsex.rmrf(`${loc}/${config.currentKey}`, function(err) {
      if (err) {
        reject(err);
      } else {
        try {
          fsex.mkdirpSync(`${loc}/${config.currentKey}`);
          fsex.mkdirpSync(`${loc}/${config.currentKey}/objects`);
          fsex.mkdirpSync(`${loc}/${config.currentKey}/schema`);
          fsex.mkdirpSync(`${loc}/${config.currentKey}/inputobjects`);
          fsex.mkdirpSync(`${loc}/${config.currentKey}/interfaces`);
          fsex.mkdirpSync(`${loc}/${config.currentKey}/enums`);
          fsex.mkdirpSync(`${loc}/${config.currentKey}/scalars`);
        } catch (e) {
          throw e;
        }

        fs.readFile(__dirname + '/../tmp/introspection.json', (err, data) => {
          if (err) throw err;
          const parsedData = JSON.parse(data);
          bar.tick();
          renderToHugo(parsedData).then(resolve);
        });
      }
    });
  });
}

module.exports = {
  init
};
