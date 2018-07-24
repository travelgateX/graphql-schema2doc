'use strict';
var config = require('./config');

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

const functions = {
  parseFields: type => {
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
        config.LOG.push(newField);
      }

      fieldsList.push(newField);
    });

    return fieldsList.length ? fieldsList : null;
  },
  parseRequiredBy: (types, name) => {
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
  },
  findSharedTypes: (coreItem, schemaTypes, foundArrayTree) => {
    const promise = new Promise((resolve, reject) => {
      buildTreeRecursive(coreItem, schemaTypes, foundArrayTree).then(res => {
        resolve(res);
      });
    });

    return promise;

    function compareString(a, b) {
      if (!a) {
        return false;
      }
      return a.localeCompare(b, undefined, { sensitivity: 'base' }) === 0;
    }

    async function buildTreeRecursive(coreItem, schemaTypes, foundArrayTree) {
      await manageRecursion(coreItem.fields, schemaTypes, foundArrayTree);

      return foundArrayTree;
    }

    function manageRecursion(item, schemaTypes, foundArrayTree) {
      const foundTypes = getTypesOfSelectedItem(
        item,
        schemaTypes,
        foundArrayTree
      );
      if (foundTypes) {
        const typesOnThisCycle = [];
        for (const ft of foundTypes) {
          const foundItem = foundArrayTree.find(
            fa =>
              compareString(fa.name, ft.name) &&
              compareString(fa.description, ft.description) &&
              compareString(fa.kind, ft.kind)
          );
          if (!foundItem) {
            typesOnThisCycle.push(ft);
            foundArrayTree.push(ft);
          }
        }

        for (const found of typesOnThisCycle) {
          if (found.fields && found.fields.length) {
            manageRecursion(found.fields, schemaTypes, foundArrayTree);
          }
        }
      }
    }

    function getTypesOfSelectedItem(fields, schemaTypes, foundArrayTree) {
      const arr = [];
      let auxArray = [];

      for (const field of fields) {
        const fieldTypes = [];
        let item;
        if (field.kind) {
          item = field;
        } else {
          if (field.args) {
            for (const arg of field.args) {
              if (arg.name) {
                fieldTypes.push(arg);
              }
              if (arg.type) {
                const argType = arg.type;
                if (argType.ofType) {
                  const ofTypes = [];
                  checkOfTypes(argType.ofType, ofTypes);
                  ofTypes.forEach(o => {
                    if (o.name) {
                      fieldTypes.push(o);
                    }
                  });
                }
              }
            }
          }
          item = field.type;
        }

        if (item.name) {
          fieldTypes.push(item);
        }

        if (item.ofType) {
          const ofTypes = [];
          checkOfTypes(item.ofType, ofTypes);
          ofTypes.forEach(o => {
            if (o.name) {
              fieldTypes.push(o);
            }
          });
        } else {
          fieldTypes.push(item);
        }

        auxArray = auxArray.concat(fieldTypes);
      }
      auxArray.map(au => {
        if (!arr.find(a => compareString(au.name, a.name))) {
          arr.push(au);
        }
      });

      const typesFound = [];
      for (const a of arr) {
        if (a.name === 'HotelXBoardQueryInput') {
          console.log('hola');
        }
        const item = schemaTypes.find(t => compareString(t.name, a.name)) || a;
        typesFound.push(item);
      }

      return typesFound;
    }

    function checkOfTypes(item, ofTypes) {
      ofTypes.push(item);

      if (item.ofType) {
        checkOfTypes(item.ofType, ofTypes);
      }
    }
  }
};

module.exports = functions;
