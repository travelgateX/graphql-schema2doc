'use strict';
var fs = require('fs');
var config = require('./config');

const LOG = [];

function sortBy(arr, property) {
  arr.sort((a, b) => {
    const aValue = a[property];
    const bValue = b[property];
    if (aValue > bValue) return 1;
    if (bValue > aValue) return -1;
    return 0;
  });
}

function renderType(type, ret) {
  if (type.kind === 'NON_NULL') {
    return renderType(type.ofType, ret) + '!';
  }
  if (type.kind === 'LIST') {
    return `[${renderType(type.ofType, ret)}]`;
  }
  ret.url = getTypeURL(type);
  ret.typeString = type.name;
  return type.name;
}

function newArgField(fieldOrArg) {
  let ret = {};
  const field = {
    typeString: renderType(fieldOrArg.type, ret),
    name: fieldOrArg.name,
    url: ret.url,
    description: fieldOrArg.description,
    isDeprecated: fieldOrArg.isDeprecated
  };

  return field;
}

function parseFields(type) {
  let fields = [];
  if (type.fields) {
    fields = type.fields;
  } else if (type.inputFields) {
    fields = type.inputFields;
  }
  var fieldsList = [];
  fields.forEach(field => {
    var args = null;

    // Looks for a date inside the deprecationReason. Also looks for a date inside the description, which would indicate deprecation too.
    // The property is splitted so it can be put inside an anchor for reference
    const baseProperty =
      field.deprecationReason &&
      /(\d{4})([\/-])(\d{1,2})\2(\d{1,2})/.test(field.deprecationReason)
        ? 'deprecationReason'
        : /(\d{4})([\/-])(\d{1,2})\2(\d{1,2})/.test(field.description)
          ? 'description'
          : false;

    if (baseProperty) {
      const splittedDescription = field[baseProperty].split(' ');

      let index = splittedDescription.findIndex(d => {
        if (d.match(/(\d{4})([\/-])(\d{1,2})\2(\d{1,2})/)) return true;
      });
      const date = splittedDescription[index].match(
        /(\d{4})([\/-])(\d{1,2})\2(\d{1,2})/
      )[0];

      const firstPartDescription = splittedDescription
        .slice(0, index)
        .join(' ');
      const secondPartDescription = splittedDescription
        .slice(index + 1, splittedDescription.length)
        .join(' ');

      field['isDeprecated'] = true;
      field['deprecationDate'] = date;
      field['descriptionSplitted'] = {
        date: date,
        first: firstPartDescription,
        second: secondPartDescription
      };
    }

    // Looks for '@deprecated' substring inside the description
    if (field.description.includes('@deprecated')) {
      field['isDeprecated'] = true;
      if (!field['deprecationReason']) {
        field['deprecationReason'] = /\"(.*?)\"/.exec(field.description)[1];
      }
    }

    if (field.args && field.args.length) {
      args = [];
      field.args.forEach((arg, i) => {
        args.push(newArgField(arg));
      });
    }
    let newField = newArgField(field);
    newField.args = args;

    if (field['deprecationReason']) {
      newField['deprecationReason'] = field['deprecationReason'];
    }
    if (field['descriptionSplitted']) {
      newField['descriptionSplitted'] = field['descriptionSplitted'];
    }
    if (field['deprecationDate']) {
      newField['deprecationDate'] = field['deprecationDate'];
    }

    if (newField.isDeprecated && newField.deprecationReason) {
      LOG.push(newField);
    }

    fieldsList.push(newField);
  });
  return fieldsList.length ? fieldsList : null;
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, ' \\n ');
}

function getTypeURL(type) {
  const url = `${config.relURL}`;
  const name = type.name.toLowerCase();
  switch (type.kind) {
    case 'INPUT_OBJECT':
      return url + '/inputobjects/' + name;
    case 'OBJECT':
      if (name === 'mutation' || name === 'query') {
        return url + '/schema/' + name;
      }
      return url + '/objects/' + name;
    case 'SCALAR':
      return url + '/scalars/' + name;
    case 'ENUM':
      return url + '/enums/' + name;
    case 'INTERFACE':
      return url + '/interfaces/' + name;
    default:
      return '#';
  }
}

function renderSchema(schema) {
  if (schema.__schema) {
    schema = schema.__schema;
  }

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

  if (config.frontmatters.DEPRECATED && LOG.length) {
    const lines = [];
    renderDeprecatedNotes(
      lines,
      config.frontmatters.DEPRECATED,
      'deprecated_notes'
    );
    saveFile(lines.join('\n'), `deprecated_notes`);
  }
}

function printer(lines, s) {
  lines.push(s);
}

function render(objects, types, dirname, template, operator = template) {
  if (objects.length) {
    sortBy(objects, 'name');
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
    fields: parseFields(type),
    requireby: parseRequiredBy(types, type.name),
    enumValues: type.enumValues,
    operator: operator,
    typename: type.name,
    hideGithubLink: true
  };

  lines.push(JSON.stringify(frontMatter, null, 2));
  if (type.description) {
    printer(lines, `${type.description}`);
  }

  printer(lines, `## ${config.SECTION1}\n`);
  printer(lines, `{{% graphql-schema-${template} %}}\n`);

  let fields = frontMatter.fields;
  if (fields && fields.length) {
    printer(lines, `## ${config.SECTION2}\n`);
    printer(lines, `{{% graphql-field %}}\n`);
  }

  if (frontMatter.requireby && frontMatter.requireby.length) {
    printer(lines, `## ${config.SECTION3}\n`);
    printer(lines, `{{% graphql-require-by %}}\n`);
  }
}

function renderDeprecatedNotes(lines, frontMatter, template) {
  frontMatter = JSON.parse(frontMatter);

  const deprecatedFields = LOG.map(l => {
    return {
      args: l.args,
      deprecationReason: l.deprecationReason,
      description: l.description,
      name: l.name,
      url: l.url,
      deprecationDate: l.deprecationDate
    };
  });

  const objectLog = {};
  const dates = Array.from(new Set(LOG.map(l => l.deprecationDate)));

  for (const date of dates) {
    const property = date || 'Unkonwn';
    objectLog[property] = deprecatedFields.filter(df => df.deprecationDate === date);
  }

  frontMatter.log = objectLog;
  lines.push(JSON.stringify(frontMatter));

  printer(lines, `## Deprecations`);
  printer(lines, `{{% ${template} %}}\n`);
}

function saveFile(l, path) {
  let lines = l;
  if (path.includes('_index')) {
    const pathArray = path.split('/');
    if (pathArray.length === 1) {
      const position = config.mdData['reference'].indexOf("pagetitle");
      const str = config.mdData['reference'];
      lines = [str.slice(0, position - 1), `"hideGithubLink": true,\n\t`, str.slice(position - 1)].join('');
    } else if (pathArray.length === 2 && config.mdData[pathArray[0]]) {
      const position = config.mdData[pathArray[0]].indexOf("pagetitle");
      const str = config.mdData[pathArray[0]];
      lines =  [str.slice(0, position - 1), `"hideGithubLink": true,\n\t`, str.slice(position - 1)].join('');
    } else {
      console.log(path);
    }
  }

  fs.writeFile(`${config.LOCATION}/${path}.md`, lines, function(err) {
    if (err) {
      return console.log(err);
    }
  });
}

function parseRequiredBy(types, name) {
  var filter = [];
  types.forEach(type => {
    var fields = [];
    if (type.fields) {
      fields = type.fields;
    } else if (type.inputFields) {
      fields = type.inputFields;
    }
    if (fields.length) {
      let f = fields.find(field => {
        let fieldName =
          field.type.kind === 'NON_NULL' || field.type.kind === 'LIST'
            ? field.type.ofType.name
            : field.type.name;
        if (fieldName === name) {
          return true;
        }
      });
      if (f) {
        filter.push({
          name: type.name,
          description: type.description,
          url: getTypeURL(type)
        });
      }
    }
  });
  return filter.length ? filter : null;
}

module.exports = renderSchema;
