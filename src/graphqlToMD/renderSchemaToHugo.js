'use strict';
var fs = require('fs');
var config = require('./config');
var bar = require(__dirname + '/../../progressBar/bar');
// var equal = require('deep-equal');
var deepDiff = require('deep-diff');

const LOG = [];
const CURRENT_DATE = new Date();

function formatDate(d) {
  const date = new Date(d);
  const day = ('' + date.getDate()).padStart(2, '0');
  const month = ('' + (date.getMonth() + 1)).padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

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
      //Formatting deprecation reason
      if (newField.deprecationReason.includes('deprecated from ')) {
        const index =
          newField.deprecationReason.search(
            /(\d{4})([\/-])(\d{1,2})\2(\d{1,2})/
          ) + 12;
        newField.deprecationReason = newField.deprecationReason.slice(index);
      }
    }
    if (field['descriptionSplitted']) {
      newField['descriptionSplitted'] = field['descriptionSplitted'];
    }
    if (field['deprecationDate']) {
      newField['deprecationDate'] = field['deprecationDate'];
    }

    if (newField.isDeprecated && newField.deprecationReason) {
      // newField.type = type;
      newField.typeName = type.name;
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
  bar.tick();
  if (config.frontmatters.DEPRECATED && LOG.length) {
    const lines = [];
    renderDeprecatedNotes(
      lines,
      config.frontmatters.DEPRECATED,
      'deprecated_notes'
    );
    saveFile(lines.join('\n'), `deprecated_notes`);
    bar.tick();
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
  const orderedLog = LOG.map(l => {
    l.dateMilliseconds = new Date(l.deprecationDate || '2100-01-01').getTime();
    return l;
  }).sort((a, b) => {
    if (a.dateMilliseconds < b.dateMilliseconds) return -1;
    if (a.dateMilliseconds > b.dateMilliseconds) return 1;
    return 0;
  });

  frontMatter = JSON.parse(frontMatter);

  const table = `|Deprecation date|Expected deletion date|Days left|Name|Location|Deprecation Reason|\n`;
  const tableLayout = `|:--|:--|:--|:--|:--|:--|\n`;
  let tableContent = ``;

  const deprecatedFields = orderedLog.map(l => {
    let deletionDate = 'unknown';
    let daysRemaining = 'unknown';
    if (l.deprecationDate) {
      const date = new Date(new Date(l.deprecationDate).getTime() + 7776000000);

      deletionDate = formatDate(CURRENT_DATE);

      daysRemaining = new Date(deletionDate).getTime() - new Date().getTime();
      if (daysRemaining >= 0) {
        daysRemaining = Math.floor(daysRemaining / 86400000);
      } else {
        daysRemaining = 'Already passed';
      }
    }

    tableContent += `|${l.deprecationDate ||
      'unknown'}|${deletionDate}|${daysRemaining}|[${l.name}](${l.url})|${
      l.typeName
    }|${l.deprecationReason}|\n`;
    return {
      args: l.args,
      deprecationReason: l.deprecationReason,
      description: l.description,
      name: l.name,
      url: l.url,
      deprecationDate: l.deprecationDate,
      typeString: l.typeString,
      typeName: l.typeName
    };
  });

  const objectLog = {};
  const dates = Array.from(new Set(LOG.map(l => l.deprecationDate)));

  for (const date of dates) {
    const property = date || 'Unknown';
    objectLog[property] = deprecatedFields.filter(
      df => df.deprecationDate === date
    );
  }

  // Fix to avoid sending the entire log to the md
  frontMatter.log = {} || objectLog;
  frontMatter.hideGithubLink = true;
  lines.push(JSON.stringify(frontMatter));
  printer(lines, table + tableLayout + tableContent);
  printer(lines, `## Deprecations`);
  printer(lines, `{{% ${template} %}}\n`);

  checkDeprecatedDeletions(objectLog);
}

function checkDeprecatedDeletions(currentlyDeprecated) {
  fs.readFile(
    __dirname + '/../deprecated-storage/deleted-notes.json',
    'utf8',
    (err, dn) => {
      let deletedNotes = {};
      if (dn) {
        deletedNotes = JSON.parse(dn);
      }
      // The name
      fs.readFile(
        __dirname + '/../deprecated-storage/stored-deprecated.json',
        'utf8',
        (err, stored) => {
          let storedData;
          if (stored) {
            storedData = JSON.parse(stored);
          }

          const difference = deepDiff.diff(storedData, currentlyDeprecated);
          // PRUEBAS
          // currentlyDeprecated['2017-11-21'][0] = {};
          //  console.log(currentlyDeprecated);
          // delete currentlyDeprecated['2018-03-19'];

          // Check if there is a difference.
          // This package is capable of figuring out which may be the differences, yet it's method of comparison is not too clear
          // and seems to compare keys by index which is of no use in this case
          if (difference && storedData) {
            // Outer loop. Compares DATES
            for (const key of Object.keys(storedData)) {
              // If the key is no more, that means it and its contents have been removed.
              // Otherwise, we check if the property is equal between the stored data and the current one.
              // If it is different, we enter another loop and keep looking for differences
              if (!(currentlyDeprecated[key] || []).length) {
                // Key does not exist in deleted notes. It is created now
                if (!deletedNotes[key]) {
                  deletedNotes[key] = storedData[key].map(pd => {
                    pd['trueDeletionDate'] = formatDate(CURRENT_DATE);
                    return pd;
                  });
                } else {
                  // Key does exist in deleted notes, past data is looped through and pushed if not found
                  for (const data of storedData[key]) {
                    if (
                      !deletedNotes[key].find(dn => {
                        return (
                          dn &&
                          data &&
                          dn.name === data.name &&
                          dn.url === data.url &&
                          dn.deprecationDate === data.deprecationDate &&
                          dn.typeString === data.typeString &&
                          dn.typeName === data.typeName
                        );
                      })
                    ) {
                      deletedNotes[key].push(data);
                    }
                  }
                }
              } else {
                // CATCH OF TESTING
                if (currentlyDeprecated[key].includes(undefined)) {
                  if (!deletedNotes[key]) {
                    deletedNotes[key] = storedData[key];
                  } else {
                    for (const item of storedData[key]) {
                      if (
                        // IF not present already in deleted notes, info gets added
                        !deletedNotes[key].find(pd => {
                          return (
                            item &&
                            pd &&
                            pd.name === item.name &&
                            pd.url === item.url &&
                            pd.deprecationDate === item.deprecationDate &&
                            pd.typeString === item.typeString &&
                            pd.typeName === item.typeName
                          );
                        })
                      ) {
                        item['trueDeletionDate'] = formatDate(CURRENT_DATE);
                        deletedNotes[key].push(item);
                      } else {
                        console.log('Already in. Hopefully');
                      }
                    }
                  }
                } else if (
                  deepDiff.diff(storedData[key], currentlyDeprecated[key])
                ) {
                  for (const item of storedData[key]) {
                    // If item of past data is not found in new data, it is added to deleted notes
                    if (
                      !currentlyDeprecated[key].find(pd => {
                        return (
                          item &&
                          pd &&
                          pd.name === item.name &&
                          pd.url === item.url &&
                          pd.deprecationDate === item.deprecationDate &&
                          pd.typeString === item.typeString &&
                          pd.typeName === item.typeName
                        );
                      })
                    ) {
                      if (!deletedNotes[key]) {
                        item['trueDeletionDate'] = formatDate(CURRENT_DATE);
                        deletedNotes[key] = [item];
                      } else if (
                        // IF not present already in deleted notes, info gets added
                        !deletedNotes[key].find(pd => {
                          return (
                            item &&
                            pd &&
                            pd.name === item.name &&
                            pd.url === item.url &&
                            pd.deprecationDate === item.deprecationDate &&
                            pd.typeString === item.typeString &&
                            pd.typeName === item.typeName
                          );
                        })
                      ) {
                        item['trueDeletionDate'] = formatDate(CURRENT_DATE);
                        deletedNotes[key].push(item);
                      } else {
                        console.log('Already in. Hopefully');
                      }
                    }
                  }
                }
              }
            }
          }
          bar.tick();
          bar.interrupt('[Checked deleted notes]');
          saveDeprecatedNotesSnapshot(currentlyDeprecated, deletedNotes);
        }
      );
    }
  );
}

function saveDeprecatedNotesSnapshot(currentlyDeprecated, deletedNotes) {
  fs.writeFile(
    __dirname + '/../deprecated-storage/stored-deprecated.json',
    JSON.stringify(currentlyDeprecated),
    function(err) {
      if (err) return console.log(err);
      bar.tick();
      bar.interrupt('[Stored current deprecated and deleted notes]');
    }
  );

  // console.log(deletedNotes);
  fs.writeFile(
    __dirname + '/../deprecated-storage/deleted-notes.json',
    JSON.stringify(deletedNotes),
    function(err) {
      if (err) return console.log(err);
      bar.tick();
      bar.interrupt('[Stored deleted notes]');
    }
  );

  if (config.frontmatters.DELETED) {
    const lines = [];
    renderDeletedNotes(
      lines,
      deletedNotes,
      config.frontmatters.DELETED
    );
    saveFile(lines.join('\n'), `deleted_notes`);
  }
}

function renderDeletedNotes(lines, deletedNotes, frontMatter) {
  let deletedNotesArray = [];

  frontMatter = JSON.parse(frontMatter);
  frontMatter.hideGithubLink = true;
  lines.push(JSON.stringify(frontMatter));
  printer(lines, `## Deletions`);

  if (deletedNotes && Object.keys(deletedNotes).length) {
    for (const key of Object.keys(deletedNotes)) {
      deletedNotes[key].map(dn => {
        dn.deletionDateMilliseconds = new Date(dn.trueDeletionDate).getTime();
      });
      deletedNotesArray = deletedNotesArray.concat(deletedNotes[key]);
    }

    const orderedDeletedNotes = deletedNotesArray.sort((a, b) => {
      if (a.deletionDateMilliseconds < b.deletionDateMilliseconds) return -1;
      if (a.deletionDateMilliseconds > b.deletionDateMilliseconds) return 1;
      return 0;
    });

    const table = `|Deletion date|Name|Old location|Deprecation Reason|\n`;
    const tableLayout = `|:--|:--|:--|:--|\n`;
    let tableContent = ``;

    for (const deletedNote of orderedDeletedNotes) {
      tableContent += `|${deletedNote.trueDeletionDate}|[${deletedNote.name}](${deletedNote.url})|${deletedNote.typeName}|${
        deletedNote.deprecationReason
      }|\n`;
    }
    printer(lines, table + tableLayout + tableContent);
  } else {
    printer(lines, `### No deletions to date`);
  }
}

function saveFile(l, path) {
  let lines = l;
  if (path.includes('_index')) {
    const pathArray = path.split('/');
    if (pathArray.length === 1) {
      const position = config.mdData['reference'].indexOf('pagetitle');
      const str = config.mdData['reference'];
      lines = [
        str.slice(0, position - 1),
        `"hideGithubLink": true,\n\t`,
        str.slice(position - 1)
      ].join('');
    } else if (pathArray.length === 2 && config.mdData[pathArray[0]]) {
      const position = config.mdData[pathArray[0]].indexOf('pagetitle');
      const str = config.mdData[pathArray[0]];
      lines = [
        str.slice(0, position - 1),
        `"hideGithubLink": true,\n\t`,
        str.slice(position - 1)
      ].join('');
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
