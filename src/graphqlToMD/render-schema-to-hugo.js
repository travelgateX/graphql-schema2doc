'use strict';
var fs = require('fs-extra');
var config = require('./../config');
var bar = require(__dirname + '/../../progressBar/bar');
var functions = require('./functions.js');
var save = require('./save.js');
var utils = require('./utils.js');
var deprecationManagement = require('./deprecation-management.js');

// MAIN FUNCTION
function evaluateFields(s) {
  const schema = s.__schema;
  // quitar comprobaciones absurdas
  const filteredTypes = [];

  for (const rItem of config.PATHS[config.currentKey].rootItems) {
    const found = schema.types.find(t => rItem.name === t.name);
    if (found) {
      filteredTypes.push(found);
    }
  }

  if ((filteredTypes || []).length) {
    // Types will depend on the option selected on the beginning

    return new Promise(resolve => {
      functions
        .findSharedTypes(filteredTypes[0], schema.types, [])
        .then(types1 => {
          schema.queryType.name = filteredTypes[0].name;
          types1.push(filteredTypes[0]);
          if (filteredTypes[1]) {
            functions
              .findSharedTypes(filteredTypes[1], schema.types, types1)
              .then(types2 => {
                schema.mutationType.name = filteredTypes[1].name;
                types2.push(filteredTypes[1]);
                schema.types = types2;
                bar.tick();
                bar.interrupt(`[Built object tree]`);
                renderSchema(schema).then(resolve);
              });
          } else {
            schema.types = types1;
            schema.queryType.name = filteredTypes[0].name;
            bar.tick();
            bar.interrupt(`[Built object tree (only Query)]`);
            renderSchema(schema).then(resolve);
          }
        });
    });
  } else {
    bar.interrupt(`[FATAL ERROR. No query nor mutation]`);
    // utils.completeBar();
  }
}

function renderSchema(schema) {
  return new Promise(resolve => {
    const filesRendered = [];
    save.saveFile(config.STRUCTURE.INDEX, `${config.currentKey}_index`);

    const types = schema.types.filter(type => !type.name.startsWith('__'));

    save
      .saveFile(
        config.STRUCTURE.INDEXSCHEMA,
        `${config.currentKey}schema/_index`
      )
      .then(_ => (filesRendered[filesRendered.length] = Promise.resolve(true)));

    const query =
      schema.queryType &&
      types.find(type => type.name === schema.queryType.name);
    if (query) {
      var lines = [];
      filesRendered[filesRendered.length] = renderObject(
        lines,
        query,
        types,
        'type',
        undefined,
        1
      );
      save.saveFile(lines.join('\n'), `${config.currentKey}schema/query`);
    }

    const mutation =
      schema.mutationType &&
      types.find(type => type.name === schema.mutationType.name);
    if (mutation) {
      var lines = [];
      filesRendered[filesRendered.length] = renderObject(
        lines,
        mutation,
        types,
        'type',
        undefined,
        2
      );
      save.saveFile(lines.join('\n'), `${config.currentKey}schema/mutation`);
    }

    const enums = types.filter(type => type.kind === 'ENUM');
    if (enums.length) {
      filesRendered[filesRendered.length] = render(
        enums,
        types,
        'enums',
        'enum'
      );
    }

    const inputObjects = types.filter(type => type.kind === 'INPUT_OBJECT');

    if (inputObjects.length) {
      filesRendered[filesRendered.length] = render(
        inputObjects,
        types,
        'inputobjects',
        'type'
      );
    }

    const interfaces = types.filter(type => type.kind === 'INTERFACE');
    if (interfaces.length) {
      filesRendered[filesRendered.length] = render(
        interfaces,
        types,
        'interfaces',
        'type',
        'interface'
      );
    }

    const objects = types.filter(
      type =>
        type.kind === 'OBJECT' &&
        type.name !== (schema.mutationType || {}).name &&
        type.name !== (schema.queryType || {}).name
    );

    if (objects.length) {
      filesRendered[filesRendered.length] = render(
        objects,
        types,
        'objects',
        'type'
      );
    }

    const scalars = types.filter(type => type.kind === 'SCALAR');
    if (scalars.length) {
      filesRendered[filesRendered.length] = render(
        scalars,
        types,
        'scalars',
        'scalar'
      );
    }

    Promise.all(filesRendered).then(_ => {
      bar.tick();
      bar.interrupt('[Rendered menu]');
      if (config.STRUCTURE.DEPRECATED && config.LOG.length) {
        deprecationManagement().then(resolve);
      } else {
        bar.tick();
        bar.tick();
        bar.tick();
        resolve();
      }
    });
  });
}

function render(objects, types, dirname, template, operator = template) {
  return new Promise((resolve, reject) => {
    if (objects.length) {
      utils.sortBy(objects, 'name');
      objects.forEach(type => {
        var lines = [];

        renderObject(lines, type, types, template, operator);
        save
          .saveFile(
            lines.join('\n'),
            `${config.currentKey}${dirname}/${type.name}`
          )
          .then();
      });
      save
        .saveFile(
          config.STRUCTURE[`INDEX${dirname.toUpperCase()}`],
          `${config.currentKey}${dirname}/_index`
        )
        .then(resolve)
        .catch(reject);
    }
  });
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

  utils.printer(lines, `## ${config.STRUCTURE.SECTION1}\n`);
  utils.printer(lines, `{{% graphql-schema-${template} %}}\n`);

  let fields = frontMatter.fields;
  if (fields && fields.length) {
    utils.printer(lines, `## ${config.STRUCTURE.SECTION2}\n`);
    utils.printer(lines, `{{% graphql-field %}}\n`);
  }

  if (frontMatter.requireby && frontMatter.requireby.length) {
    utils.printer(lines, `## ${config.STRUCTURE.SECTION3}\n`);
    utils.printer(lines, `{{% graphql-require-by %}}\n`);
  }
}

module.exports = evaluateFields;
