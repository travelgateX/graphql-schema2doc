const renderToHugo = require('./renderSchemaToHugo'),
  config = require('./config'),
  fs = require('fs'),
  fsex = require('fs.extra'),
  bar = require(__dirname + '/../../progressBar/bar');


function init() {
  fs.readFile(__dirname + '/../tmp/md-data.json', (err, data) => {
    if (err) throw err;
    config.mdData = JSON.parse(data);
  });
  var removeDir = new Promise((resolve, reject) =>
    fsex.rmrf(config.LOCATION, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve('ok');
      }
    })
  );
  removeDir.then(res => {
    try {
      fsex.mkdirpSync(config.LOCATION);
      fsex.mkdirpSync(config.LOCATION + '/objects');
      fsex.mkdirpSync(config.LOCATION + '/schema');
      fsex.mkdirpSync(config.LOCATION + '/inputobjects');
      fsex.mkdirpSync(config.LOCATION + '/interfaces');
      fsex.mkdirpSync(config.LOCATION + '/enums');
      fsex.mkdirpSync(config.LOCATION + '/scalars');
    } catch (e) {
      throw e;
    }

    fs.readFile(__dirname + '/../tmp/introspection.json', (err, data) => {
      if (err) throw err;
      const json = JSON.parse(data);
      bar.tick();
      renderToHugo(json);
    });
  });
}

module.exports = {
  init
};
