const renderToHugo = require('./render-schema-to-hugo'),
  config = require('./config'),
  fsex = require('fs-extra'),
  bar = require(__dirname + '/../../progressBar/bar');

function init() {
  fsex.readFile(__dirname + '/../tmp/md-data.json', (err, data) => {
    if (err) throw err;
    config.MD_DATA = JSON.parse(data);
  });

  console.log(config.getDeprecatedNotesLocation());

  fsex.emptyDirSync(config.getLocation());
  fsex.emptyDirSync(config.getLocation() + '/objects');
  fsex.emptyDirSync(config.getLocation() + '/schema');
  fsex.emptyDirSync(config.getLocation() + '/inputobjects');
  fsex.emptyDirSync(config.getLocation() + '/interfaces');
  fsex.emptyDirSync(config.getLocation() + '/enums');
  fsex.emptyDirSync(config.getLocation() + '/scalars');

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
