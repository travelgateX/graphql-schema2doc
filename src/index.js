const fs = require('fs-extra'),
  glob = require('glob'),
  async = require('async'),
  faker = require(__dirname + '/../graph_faker/gr_faker').main,
  extendables = require(__dirname + '/extendables').extendables,
  fetchSchemaJSON = require(__dirname + '/fetchSchemaJSON'),
  toMD = require("./graphqlToMD");

const mds = {
  default: '',
  enums: '',
  interfaces: '',
  objects: '',
  reference: '',
  scalars: ''
};

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

      fs.writeFile(
        __dirname + '/merged_schema.graphql',
        data.join('\n'),
        function(err) {
          if (err) return console.log(err);
          console.log('******* CREATED QUERY *******');
          fakeSchema();
        }
      );
    });
  }
);

function readAsync(file, callback) {
  fs.readFile(file, 'utf8', callback);
}

function fakeSchema() {
  faker(__dirname + '/merged_schema.graphql', () => {}, '9002');

  fetchSchemaJSON().then(res => {
    fs.writeFile(
      __dirname + '/introspection.json',
      JSON.stringify(res),
      function(err) {
        if (err) return console.log(err);
        console.log('******* CREATED INTROSPECTION JSON *******');
        readMDs();
      }
    );
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

function readMDs() {
  glob(__dirname + '/../graphql-schema/_skel/*.md', {}, function(er, files) {
    const filteredFiles = files.filter(f => !f.includes('README.md'));

    const results = async.map(filteredFiles, readAsync, function(err, results) {
      for (const result of results) {
        const lowerCaseResult = result.toLowerCase();
        Object.keys(mds).map(k => {
          if (lowerCaseResult.includes(String.raw`: "${k}"`)) {
            mds[k] = result;
          } else if (lowerCaseResult.includes('% graphql-schema-type %')) {
            mds['default'] = result;
          }
        });
      }
      writeMdJSON(mds);
    });
  });
}

function writeMdJSON(mds) {
  fs.writeFile(__dirname + '/md-data.json', JSON.stringify(mds), function(err) {
    if (err) return console.log(err);
    console.log('******* CREATED MD DATA JSON *******');
    toMD.init();
  });

  // const mdData = fs.createWriteStream(__dirname + '/md-data.json');
  // mdData.once('open', _ => {
  //   mdData.write(JSON.stringify(r));
  //   mdData.end();
  //   mdData.on('finish', _ => {
  //     console.log('******* CREATED MD DATA JSON *******');
  //     // readMDs();
  //   });
  //   mdData.on('error', _ => console.log(errorMsg));
  // });
}
