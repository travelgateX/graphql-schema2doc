'use strict';
var fs = require('fs');
var config = require('./config');
var globalConfig = require('./../config');
var bar = require(__dirname + '/../../progressBar/bar');
var functions = require('./functions.js');
var saveFile = require('./save.js');
var utils = require('./utils.js');
var deprecationManagement = require('./deprecation-management.js');

// MAIN FUNCTION
function evaluateFields(s) {
  const schema = s.__schema;

  if (globalConfig.USER_CHOICES.filter !== 'Everything') {
    let aux;
    let coreItem;

    // If-else block that sorts out which query type is to be filtered
    if (globalConfig.USER_CHOICES.filter.includes('HotelX')) {
      aux = 'HotelXQuery';
    }
    const type = schema.types.filter(t => t.name === aux);
    if ((type || []).length) {
      coreItem = schema.types.filter(t => t.name === aux)[0];
      functions.findSharedTypes(coreItem, schema.types).then(types => {
        // Types will depend on the option selected on the beginning
        schema.types = types;
        renderSchema(schema);
      });

      bar.tick();
      bar.interrupt(`[Built object tree]`);
    } else {
      bar.tick();
    }
  } else {
    // In case we select 'Everything'
    renderSchema(schema);
  }
}

function renderSchema(schema) {
  saveFile(config.frontmatters.INDEX, `_index`);

  const types = schema.types.filter(type => !type.name.startsWith('__'));

  const queryType = schema.queryType;
  const mutationType = schema.mutationType;

  const objects = types.filter(
    type =>
      type.kind === 'OBJECT' &&
      type.name !== schema.mutationType.name &&
      type.name !== schema.queryType.name
  );

  render(objects, types, 'objects', 'type');

  const enums = types.filter(type => type.kind === 'ENUM');
  render(enums, types, 'enums', 'enum');

  const inputObjects = types.filter(type => type.kind === 'INPUT_OBJECT');
  render(inputObjects, types, 'inputobjects', 'type');

  const query =
    queryType && types.find(type => type.name === schema.queryType.name);
  if (query) {
    var lines = [];
    renderObject(lines, query, types, 'type');
    saveFile(lines.join('\n'), `schema/query`);
  }

  const mutation =
    mutationType && types.find(type => type.name === schema.mutationType.name);
  if (mutation) {
    var lines = [];
    renderObject(lines, mutation, types, 'type');
    saveFile(lines.join('\n'), `schema/mutation`);
  }

  saveFile(config.frontmatters.INDEXSCHEMA, `schema/_index`);

  const scalars = types.filter(type => type.kind === 'SCALAR');
  render(scalars, types, 'scalars', 'scalar');

  const interfaces = types.filter(type => type.kind === 'INTERFACE');
  render(interfaces, types, 'interfaces', 'type', 'interface');
  bar.tick();
  if (config.frontmatters.DEPRECATED && config.LOG.length) {
    const lines = [];
    // disabled deprecation stuff unless all selected
    deprecationManagement();

    bar.tick();
  }
}

function render(objects, types, dirname, template, operator = template) {
  if (objects.length) {
    utils.sortBy(objects, 'name');
    objects.forEach(type => {
      var lines = [];
     
      renderObject(lines, type, types, template, operator);
      saveFile(lines.join('\n'), `${dirname}/${type.name}`);
    });
    saveFile(
      config.frontmatters[`INDEX${dirname.toUpperCase()}`],
      `${dirname}/_index`
    );
  }
}

function renderObject(lines, type, types, template, operator = template) {
  let frontMatter = {
    title: type.name,
    description: '',
    weight: 1,
    fields: functions.parseFields(type),
    requireby: functions.parseRequiredBy(types, type.name),
    enumValues: type.enumValues,
    operator: operator,
    typename: type.name,
    hideGithubLink: true
  };

  lines.push(JSON.stringify(frontMatter, null, 2));
  if (type.description) {
    utils.printer(lines, `${type.description}`);
  }

  utils.printer(lines, `## ${config.SECTION1}\n`);
  utils.printer(lines, `{{% graphql-schema-${template} %}}\n`);

  let fields = frontMatter.fields;
  if (fields && fields.length) {
    utils.printer(lines, `## ${config.SECTION2}\n`);
    utils.printer(lines, `{{% graphql-field %}}\n`);
  }

  if (frontMatter.requireby && frontMatter.requireby.length) {
    utils.printer(lines, `## ${config.SECTION3}\n`);
    utils.printer(lines, `{{% graphql-require-by %}}\n`);
  }
}

module.exports = evaluateFields;
