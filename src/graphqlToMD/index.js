const renderToHugo = require('./render-schema-to-hugo'),
  config = require('./config'),
  fsex = require('fs-extra'),
  bar = require(__dirname + '/../../progressBar/bar');

function init() {
  fsex.readFile(__dirname + '/../tmp/md-data.json', (err, data) => {
    if (err) throw err;
    config.MD_DATA = JSON.parse(data);
  });

  fsex.emptyDirSync(config.LOCATION);
  fsex.emptyDirSync(config.LOCATION + '/objects');
  fsex.emptyDirSync(config.LOCATION + '/schema');
  fsex.emptyDirSync(config.LOCATION + '/inputobjects');
  fsex.emptyDirSync(config.LOCATION + '/interfaces');
  fsex.emptyDirSync(config.LOCATION + '/enums');
  fsex.emptyDirSync(config.LOCATION + '/scalars');

  fsex.readFile(__dirname + '/../tmp/introspection.json', (err, data) => {
    if (err) throw err;
    const parsedData = JSON.parse(data);
    bar.tick();
    if (config.SCHEMA_OPTIONS.length) {
      parsedData.__schema.queryType = config.SCHEMA_OPTIONS[0];
      parsedData.__schema.mutationType = config.SCHEMA_OPTIONS[1];
    }

    renderToHugo(parsedData);
  });
}

module.exports = {
  init
};
