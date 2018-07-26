const fs = require('fs-extra'),
  glob = require('glob'),
  async = require('async'),
  faker = require(__dirname + '/../graph_faker/gr_faker').main,
  extendables = require(__dirname + '/resources/extendables').extendables,
  fetchSchemaJSON = require(__dirname + '/resources/fetchSchemaJSON'),
  toMD = require(__dirname + '/graphqlToMD'),
  bar = require(__dirname + '/../progressBar/bar'),
  inquirer = require('inquirer'),
  config = require(__dirname + '/config.js'),
  childConfig = require(__dirname + '/graphqlToMD/config.js');

const mds = {
  default: '',
  enums: '',
  interfaces: '',
  objects: '',
  reference: '',
  scalars: '',
  schema: '',
  inputobjects: ''
};

const questions = [
  {
    type: 'list',
    name: 'filter',
    message: 'What do you want to generate?',
    choices: config.USER_OPTIONS
  }
];

// Starting function
initScript();

function initScript() {
  fs.emptyDir(__dirname + '/tmp/', err => {
    if (err) return console.error(err);
    inquirer.prompt(questions).then(function(answers) {
      config.USER_CHOICES.filter = answers.filter;
      // config.USER_CHOICES.root

      switch (config.USER_CHOICES.filter) {
        case 'all':
          childConfig.ALL_SCHEMAS = true;
          break;
        case 'hotelx':
          childConfig.SCHEMA_OPTIONS = [
            { name: 'HotelXQuery' },
            { name: 'HotelXMutation' }
          ];
          childConfig.resetLocations('/hotelx/');
          break;
        case 'paymentx':
          childConfig.SCHEMA_OPTIONS = [
            { name: 'PaymentXQuery' },
            { name: 'PaymentXMutation' }
          ];
          childConfig.resetLocations('/paymentx/');
          break;
        case 'mappea':
          childConfig.SCHEMA_OPTIONS = [
            { name: 'MappeaQuery' },
            { name: 'MappeaMutation' }
          ];
          childConfig.resetLocations('/mappea/');
          break;
        case 'stats':
          childConfig.SCHEMA_OPTIONS = [{ name: 'StatsQuery' }];
          childConfig.resetLocations('/stats/');
          break;
      }

      console.log('\n');
      if (fs.existsSync(childConfig.DOCUMENTATION_LOCATION)) {
        bar.tick();
        createQuery();
      } else {
        console.log(
          'Output path is nor correct. Please, move the project to the folder containing documentation-site or modify the configurations'
        );
      }
    });
  });
}

function createQuery() {
  glob(
    __dirname + '/../graphql-schema/**/*.graphql',
    { ignore: ['tmp/**', 'node_modules/**', 'graph_faker/**'] },
    function(er, files) {
      const results = async.map(files, readAsync, function(err, results) {
        bar.tick();
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
            ${extendableTypesInfo[ext].extend || ''} 
            }`;
          }
        }

        fs.writeFile(
          __dirname + '/tmp/merged_schema.graphql',
          data.join('\n'),
          function(err) {
            if (err) return console.log(err);
            bar.tick();
            bar.interrupt('[Created Schema]');
            fakeSchema();
          }
        );
      });
    }
  );
}

function readAsync(file, callback) {
  fs.readFile(file, 'utf8', callback);
}

function fakeSchema() {
  faker(__dirname + '/tmp/merged_schema.graphql', () => {}, '9002');

  fetchSchemaJSON().then(res => {
    res.__schema.types = res.__schema.types.map(t => {
      if (t.fields) {
        t.fields = t.fields.filter(f => f.name !== 'a');
      }
      return t;
    });
    fs.writeFile(
      __dirname + '/tmp/introspection.json',
      JSON.stringify(res),
      function(err) {
        if (err) return console.log(err);
        bar.tick();
        bar.interrupt('[Created introspection JSON]');
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
      if (info[e].extend) {
        info[
          e
        ].extend += `\n# Extend ${e} separator -----------------------------------\n ${extend}`;
      } else {
        info[e].extend = extend;
      }
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
    async.map(filteredFiles, readAsync, function(err, results) {
      for (const result of results) {
        const lowerCaseResult = result
          .split(' ')
          .join('')
          .toLowerCase();
        Object.keys(mds).map(k => {
          if (lowerCaseResult.includes(String.raw`"title":"${k}"`)) {
            mds[k] = result;
          } else if (lowerCaseResult.includes('%graphql-schema-type%')) {
            mds['default'] = result;
          }
        });
      }
      writeMdJSON();
    });
  });
}

function writeMdJSON() {
  fs.writeFile(__dirname + '/tmp/md-data.json', JSON.stringify(mds), function(
    err
  ) {
    if (err) return console.log(err);
    bar.tick();
    bar.interrupt('[Created MD data JSON]');
    if (childConfig.ALL_SCHEMAS) {
      bar.total *= 3;
      (async function loop() {
        for (const key in childConfig.ALL_SCHEMAS_OPTIONS) {
          await new Promise(resolve => {
            childConfig.SCHEMA_OPTIONS = childConfig.ALL_SCHEMAS_OPTIONS[key];
            config.USER_CHOICES.filter = key.slice(1, - 1);
            childConfig.resetLocations(key);
            toMD.init();
            setTimeout(resolve, 10000);
          });
        }
      })();
    }
    toMD.init();
  });
}
