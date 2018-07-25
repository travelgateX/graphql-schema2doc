'use strict';
var fs = require('fs-extra')
var config = require('./config');
var globalConfig = require('./../config');
var bar = require(__dirname + '/../../progressBar/bar');
var functions = require('./functions.js');
var save = require('./save.js');
var utils = require('./utils.js');
var deprecationManagement = require('./deprecation-management.js');

// MAIN FUNCTION
function evaluateFields(s) {
  const schema = s.__schema;
  if (globalConfig.USER_CHOICES.filter !== 'travelgatex') {
    const filterOptions = config.SCHEMA_OPTIONS.map(so => so.name);
    
    const filteredTypes = schema.types.filter(t =>
      filterOptions.includes(t.name)
    );
    
    if ((filteredTypes || []).length) {
      // Types will depend on the option selected on the beginning
      functions
        .findSharedTypes(filteredTypes[0], schema.types, [])
        .then(types1 => {
          types1.push(filteredTypes[0]);
          if (filteredTypes[1]) {
            functions
              .findSharedTypes(filteredTypes[1], schema.types, types1)
              .then(types2 => {
                types2.push(filteredTypes[1]);
                schema.types = types2;
                bar.tick();
                bar.interrupt(`[Built object tree]`);
                renderSchema(schema);
              });
          } else {
            schema.types = types1;
            bar.tick();
            bar.interrupt(`[Built object tree (only Query)]`);
            renderSchema(schema);
          }
        });
    } else {
      bar.interrupt(`[FATAL ERROR. No query nor mutation]`);
      // utils.completeBar();
    }
  } else {
    config.SCHEMA_OPTIONS = [schema.queryType, schema.mutationType];
    // In case we select 'travelgatex'
    renderSchema(schema);
  }
}

function renderSchema(schema) {
  

  save.saveFile(config.frontmatters.INDEX, `_index`);

  const types = schema.types.filter(type => !type.name.startsWith('__'));

  const objects = types.filter(
    type =>
      type.kind === 'OBJECT' &&
      type.name !== (schema.mutationType || {}).name &&
      type.name !== (schema.queryType || {}).name
  );

  render(objects, types, 'objects', 'type');

  const enums = types.filter(type => type.kind === 'ENUM');
  render(enums, types, 'enums', 'enum');

  const inputObjects = types.filter(type => type.kind === 'INPUT_OBJECT');
 
  render(inputObjects, types, 'inputobjects', 'type');

  const query =
    schema.queryType && types.find(type => type.name === schema.queryType.name);
  if (query) {
    var lines = [];
    renderObject(lines, query, types, 'type', undefined, 1);
    save.saveFile(lines.join('\n'), `schema/query`);
  }

  const mutation =
    schema.mutationType &&
    types.find(type => type.name === schema.mutationType.name);
  if (mutation) {
    var lines = [];
    renderObject(lines, mutation, types, 'type', undefined, 2);
    save.saveFile(lines.join('\n'), `schema/mutation`);
  }

  save.saveFile(config.frontmatters.INDEXSCHEMA, `schema/_index`);

  const scalars = types.filter(type => type.kind === 'SCALAR');
  render(scalars, types, 'scalars', 'scalar');

  const interfaces = types.filter(type => type.kind === 'INTERFACE');
  render(interfaces, types, 'interfaces', 'type', 'interface');
  bar.tick();
  bar.interrupt('[Rendered menu]');
  if (config.frontmatters.DEPRECATED && config.LOG.length) {
    deprecationManagement();
    // utils.completeBar();

  } else {
    // utils.completeBar();
  }
}

function render(objects, types, dirname, template, operator = template) {
  if (objects.length) {
    utils.sortBy(objects, 'name');
    objects.forEach(type => {
      var lines = [];

      renderObject(lines, type, types, template, operator);
      save.saveFile(lines.join('\n'), `${dirname}/${type.name}`);
    });
    save.saveFile(
      config.frontmatters[`INDEX${dirname.toUpperCase()}`],
      `${dirname}/_index`
    );
  }
}

function renderObject(
  lines,
  type,
  types,
  template,
  operator = template,
  weight = 1
) {
  let frontMatter = {
    title: type.name,
    description: '',
    weight: weight,
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
