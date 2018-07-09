const renderToHugo = require('./render-schema-to-hugo'),
  config = require('./config'),
  globalConfig = require('./../config'),
  fs = require('fs'),
  fsex = require('fs.extra'),
  bar = require(__dirname + '/../../progressBar/bar');

function init() {
  if (globalConfig.USER_CHOICES.filter !== 'Everything') {
    config.PATH = '/hotelx/';
    config.relURL = config.PATH + config.DIRNAME;
    config.LOCATION += '-hotelX';
  }else{
    
  }
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

    // Patch
    try {
      fsex.mkdirpSync(__dirname + '/../deprecated-storage');
      fsex.mkdirpSync(__dirname + '/../deprecated-storage/travelgatex');
      fsex.mkdirpSync(__dirname + '/../deprecated-storage/hotelx');
    } catch (e) {
      throw e;
    }
    // - Patch

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
