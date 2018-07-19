const renderToHugo = require('./render-schema-to-hugo'),
  config = require('./config'),
  globalConfig = require('./../config'),
  fs = require('fs'),
  fsex = require('fs.extra'),
  bar = require(__dirname + '/../../progressBar/bar');

function init() {
  fs.readFile(__dirname + '/../tmp/md-data.json', (err, data) => {
    if (err) throw err;
    config.MD_DATA = JSON.parse(data);
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

    // Patch: Folders are created if not there
    const deprecated_storage = __dirname + '/../deprecated-storage';
    if (!fs.existsSync(deprecated_storage)) {
      fs.mkdirSync(deprecated_storage);
    }
    if (!fs.existsSync(deprecated_storage + '/travelgatex')) {
      fs.mkdirSync(deprecated_storage + '/travelgatex');
    }
    if (!fs.existsSync(deprecated_storage + '/hotelx')) {
      fs.mkdirSync(deprecated_storage + '/hotelx');
    }
    // - Patch

    fs.readFile(__dirname + '/../tmp/introspection.json', (err, data) => {
      if (err) throw err;
      const parsedData = JSON.parse(data);
      bar.tick();
      if (globalConfig.USER_CHOICES.filter !== 'Everything') {
        parsedData.__schema['mainQueryType'] = {name:"HotelXQuery"};
        parsedData.__schema['mainMutationType'] = {name:"HotelXMutation"};
      }
      renderToHugo(parsedData);
    });
  });
}

module.exports = {
  init
};
