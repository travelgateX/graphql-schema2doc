const renderToHugo = require('./render-schema-to-hugo'),
  config = require('./config'),
  fsex = require('fs-extra'),
  bar = require(__dirname + '/../../progressBar/bar');

function init() {
  fsex.readFile(__dirname + '/../tmp/md-data.json', (err, data) => {
    if (err) throw err;
    config.MD_DATA = JSON.parse(data);
  });

  const loc = config.getLocation();

  process.umask(777)

  fsex.emptyDir(loc, err => {
    if (err) return console.error(err);
    setTimeout(_ => {
      // fsex.chmodSync(loc, 0777);
      fsex.emptyDirSync(`${loc}/objects`);
      fsex.emptyDirSync(`${loc}/schema`);
      fsex.emptyDirSync(`${loc}/inputobjects`);
      fsex.emptyDirSync(`${loc}/interfaces`);
      fsex.emptyDirSync(`${loc}/enums`);
      fsex.emptyDirSync(`${loc}/scalars`);

      fsex.readFile(
        __dirname + '/../tmp/introspection.json',
        (err, data) => {
          if (err) throw err;
          const parsedData = JSON.parse(data);
          bar.tick();
          if (config.SCHEMA_OPTIONS.length) {
            parsedData.__schema.queryType = config.SCHEMA_OPTIONS[0];
            parsedData.__schema.mutationType = config.SCHEMA_OPTIONS[1];
          }

          renderToHugo(parsedData);
        },
        1000
      );
    });
  });
}

module.exports = {
  init
};
