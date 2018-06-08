const fs = require('fs'),
  glob = require('glob'),
  async = require('async'),
  faker = require(__dirname + '/../graph_faker/gr_faker').main,
  extendables = require(__dirname + '/extendables').extendables,
  fetchSchemaJSON = require(__dirname + '/fetchSchemaJSON');

glob(
  __dirname + '/../graphql-schema/**/*.graphql',
  { ignore: ['merged_schema.graphql', 'node_modules/**', 'graph_faker/**'] },
  function(er, files) {
    const results = async.map(files, readAsync, function(err, results) {
      const extendableTypesInfo = {};
      const data = [''];
      extendables.map(e => (extendableTypesInfo[e] = {}));
      results.map(file => {
        const res = findExtendables(file, extendableTypesInfo);
        if (res.includes('placeholder')) {
          data.push(res);
        } else if (res === 'default') {
          data.push(file);
        }
      });

      for (const ext of extendables) {
        const index = data.findIndex(d => d.includes('placeholder' + ext));

        if (index && extendableTypesInfo[ext].type) {
          data[index] = `
            ${extendableTypesInfo[ext].type} 
            ${extendableTypesInfo[ext].extend} 
            }`;
        }
      }
      var stream = fs.createWriteStream(__dirname + '/merged_schema.graphql');
      stream.once('open', function(fd) {
        stream.write(data.join('\n'));
        stream.end();
        stream.on('finish', _ => fakeSchema());
        stream.on('error', _ => console.log(errorMsg));
      });
    });
  }
);

function readAsync(file, callback) {
  fs.readFile(file, 'utf8', callback);
}

function fakeSchema() {
  faker(__dirname + '/merged_schema.graphql', () => {}, '9002');

  fetchSchemaJSON().then(res => {
    const introspection = fs.createWriteStream(
      __dirname + '/introspection.json'
    );
    introspection.once('open', function(fd) {
      introspection.write(JSON.stringify(res));
      introspection.end();
      introspection.on('finish', _ => console.log('done'));
      introspection.on('error', _ => console.log(errorMsg));
    });
  });
}

function findExtendables(file, info) {
  let result = 'default';
  extendables.map(e => {
    if (file.includes('extend type ' + e)) {
      result = 'ignore';
      const extend = file.substring(
        file.lastIndexOf('{') + 1,
        file.lastIndexOf('}')
      );
      info[e].extend = extend;
    } else if (file.includes('type ' + e)) {
      result = `placeholder${e}`;
      const type = file.substring(0, file.lastIndexOf('}'));
      info[e].type = type;
    }
  });

  return result;
}
