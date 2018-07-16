'use strict';
var config = require('./config');
var fs = require('fs');
var utils = require('./utils');
var deepDiff = require('deep-diff');
var bar = require('./../../progressBar/bar');
var saveFile = require('./save.js');

function renderDeprecatedNotes(lines, frontMatter, template) {
  const orderedLog = config.LOG.map(l => {
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
    l.deletionDate = 'unknown';
    l.daysRemaining = 'unknown';
    if (l.deprecationDate) {
      const date = new Date(new Date(l.deprecationDate).getTime() + 7776000000);

      l.deletionDate = utils.formatDate(date);

      l.daysRemaining =
        new Date(l.deletionDate).getTime() - new Date().getTime();
      if (l.daysRemaining >= 0) {
        l.daysRemaining = Math.floor(l.daysRemaining / 86400000);
      } else {
        l.daysRemaining = 'Already passed';
      }
    }

    tableContent += `|${l.deprecationDate || 'unknown'}|${l.deletionDate}|${
      l.daysRemaining
    }|[${l.name}](${l.url})|${l.typeName}|${l.deprecationReason}|\n`;
    return l;
  });

  const objectLog = {};
  const dates = Array.from(new Set(config.LOG.map(l => l.deprecationDate)));

  for (const date of dates) {
    const property = date || 'Unknown';
    objectLog[property] = deprecatedFields.filter(
      df => df.deprecationDate === date
    );
  }

  // Fix to avoid sending the entire log to the md
  frontMatter.log = {} || objectLog;
  frontMatter.hideGithubLink = true;
  lines.push(JSON.stringify(frontMatter, null, '\t'));
  lines.push(
    '\n{{% alert theme="info" %}}Changes that can break existing queries to the GraphQL API. For example, removing a field would be a breaking change{{% /alert %}}\n'
  );
  utils.printer(lines, table + tableLayout + tableContent);
  utils.printer(lines, `## Deprecations`);
  utils.printer(lines, `{{% ${template} %}}\n`);

  checkDeprecatedDeletions(objectLog);
}

function checkDeprecatedDeletions(currentlyDeprecated) {
  fs.readFile(
    __dirname + `/../deprecated-storage${config.PATH}deleted-notes.json`,
    'utf8',
    (err, dn) => {
      let deletedNotes = {};
      if (dn) {
        deletedNotes = JSON.parse(dn);
      }
      // The name
      fs.readFile(
        __dirname +
          `/../deprecated-storage${config.PATH}stored-deprecated.json`,
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
                    pd['trueDeletionDate'] = utils.formatDate(
                      config.CURRENT_DATE
                    );
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
                        item['trueDeletionDate'] = utils.formatDate(
                          config.CURRENT_DATE
                        );
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
                        item['trueDeletionDate'] = utils.formatDate(
                          config.CURRENT_DATE
                        );
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
                        item['trueDeletionDate'] = utils.formatDate(
                          config.CURRENT_DATE
                        );
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
    __dirname + `/../deprecated-storage${config.PATH}stored-deprecated.json`,
    JSON.stringify(currentlyDeprecated),
    function(err) {
      if (err) return console.log(err);
      bar.tick();
      bar.interrupt('[Stored current deprecated and deleted notes]');
    }
  );

  // console.log(deletedNotes);
  fs.writeFile(
    __dirname + `/../deprecated-storage${config.PATH}deleted-notes.json`,
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
      config.frontmatters.DELETED,
      utils.copy(currentlyDeprecated)
    );
    saveFile(lines.join('\n'), `breaking-changes`);
  }
}

/**
 * Format that is encouraged
 * {
 * key: date(string),
 * value: [
 *    {
 *      type: letter(string),
 *      value: [
 *         entry item(object)
 *      ]
 *    }
 * ]
 * }
 */

function renderDeletedNotes(
  lines,
  deletedNotes,
  frontMatter,
  currentlyDeprecated
) {
  frontMatter = JSON.parse(frontMatter);
  frontMatter.hideGithubLink = true;
  lines.push(JSON.stringify(frontMatter, null, '\t'));
  lines.push(
    '\n{{% alert theme="info" %}}Changes history of deprecated notes previously announced{{% /alert %}}\n'
  );

  if (deletedNotes && Object.keys(deletedNotes).length) {
    let newDeletedNotesArr = [];
    // In the future, the array of items should contain sub arrays of different types of changes
    for (const key of Object.keys(deletedNotes)) {
      for (const item of deletedNotes[key]) {
        const foundDate = newDeletedNotesArr.find(
          ndn => ndn.key === item.trueDeletionDate
        );
        if (!foundDate) {
          newDeletedNotesArr.push({
            key: item.trueDeletionDate,
            value: [{ type: 'r', value: [item] }]
          });
        } else {
          // Date register exists, but we still don't know if list type [d,c,u...] exists inside
          const foundType = foundDate.value.find(v => v.type === 'r');
          if (foundType) {
            // Push another value inside array of TYPES
            foundType.value.push(item);
          } else {
            // Push NEW type inside date
            foundDate.value.push({ type: 'r', value: [item] });
          }
        }
      }
    }

    const formattedDeprecatedUnreleased = formatDeprecatedUnreleasedNotes(
      currentlyDeprecated
    );

    utils.log('formattedDeprecatedUnreleased', formattedDeprecatedUnreleased);

    // 12/07/2018 Recreate deleted as deprecated, so there can be seen properly on the timeline.
    const deletedAsDeprecated = [];
    recreateArrayAsType(deletedAsDeprecated, newDeletedNotesArr, 'd');
    fuseEqualArrays(newDeletedNotesArr, deletedAsDeprecated);
    fuseEqualArrays(newDeletedNotesArr, formattedDeprecatedUnreleased);

    // 12/07/2018 Deprecated are added to the same page
    newDeletedNotesArr = formatDeprecatedNotes(
      currentlyDeprecated,
      newDeletedNotesArr
    );

    for (const entry of newDeletedNotesArr) {
      const time =
        isNaN(entry.key) && isNaN(Date.parse(entry.key)) ? 0 : entry.key;
      entry.deletionDateMilliseconds = new Date(time).getTime();
    }

    const orderedDeletedNotes = newDeletedNotesArr.sort((a, b) => {
      if (a.deletionDateMilliseconds < b.deletionDateMilliseconds) return 1;
      if (a.deletionDateMilliseconds > b.deletionDateMilliseconds) return -1;
      return 0;
    });

    // Loop through all deleted notes creating a call to the shortcode
    for (const date of orderedDeletedNotes) {
      if(date.key !== 99999999999999){
        utils.printer(lines, `### ${date.key}`);
      }else{
        utils.printer(lines, `### Unreleased`);
      }
      for (const changeType of date.value) {
        const shorcode = `{{% release-notes-container type="${
          changeType.type
        }"%}}`;
        utils.printer(lines, shorcode);

        for (const change of changeType.value) {
          utils.printer(lines, createRegister(change, changeType.type));
        }

        utils.printer(lines, `{{% / release-notes-container %}}`);
      }
    }
  } else {
    utils.printer(lines, `### No deletions to date`);
  }
}

function createRegister(change, type) {
  let keyword = '';
  let dateInfo = '';
  let additionalInfo = '';

  switch (type) {
    case 'a':
      keyword = 'Added';
      break;
    case 'c':
      keyword = 'Changed';
      break;
    case 'd':
      keyword = 'Deprecated';
      if (change.trueDeletionDate) {
        dateInfo = `Finally removed on ${change.trueDeletionDate}`;
      } else {
        dateInfo = `Expected deprecation on ${change.deprecationDate}`;
        additionalInfo = '';
      }
      break;
    case 'r':
      keyword = 'Removed';
      dateInfo = `Deprecated on ${change.deprecationDate}`;
      break;
    case 'f':
      keyword = 'Fixed';
      break;
    case 's':
      keyword = 'Security';
      break;
    case 'u':
      keyword = change.subject;
      break;
  }

  return `- ${keyword} \`${change.name}\` from \`${
    change.typeName
  }\`. Reason: ${change.deprecationReason}. ${dateInfo} ${additionalInfo}.`;
}

// this might replace the function of deprecation
function formatDeprecatedNotes(currentlyDeprecated, newDeletedNotesArr) {
  for (const key of Object.keys(currentlyDeprecated)) {
    const foundDate = newDeletedNotesArr.find(a => a.key === key);
    if (foundDate) {
      const foundType = foundDate.value.find(f => f.type === 'd');
      if (foundType) {
        foundType.value.push(currentlyDeprecated[key]);
      } else {
        foundDate.value.push({ type: 'd', value: currentlyDeprecated[key] });
      }
    } else {
      newDeletedNotesArr.push({
        key: key,
        value: [{ type: 'd', value: currentlyDeprecated[key] }]
      });
    }
  }

  return newDeletedNotesArr;
}

// this might replace the function of deprecation
function formatDeprecatedUnreleasedNotes(currentlyDeprecated) {
  const deprecatedUnreleasedArray = [];
  let date_u = { key: 99999999999999, value: [{ type: 'u', value: [] }] };

  for (const key of Object.keys(currentlyDeprecated)) {
    const date_d = { key: key, value: [{ type: 'd', value: [] }] };
    for (const entry of currentlyDeprecated[key]) {
      date_d.value[0].value.push(entry);
      date_u.value[0].value.push(entry);
    }

    deprecatedUnreleasedArray.push(date_d);
  }
  date_u = utils.copy(date_u);
  date_u.value[0].value.map(v=>v.subject = 'Removal of')
  deprecatedUnreleasedArray.push(date_u);
  return deprecatedUnreleasedArray;
}

// Creates new array...
function recreateArrayAsType(target, arr, typeChange) {
  const newArray = utils.copy(arr);
  for (const date of newArray) {
    for (const type of date.value) {
      for (const entry of type.value) {
        const targetDate = target.find(t => t.key === entry.deprecationDate);
        if (targetDate) {
          targetDate.value[0].value.push(entry);
        } else {
          target.push({
            key: entry.deprecationDate,
            value: [{ type: typeChange, value: [entry] }]
          });
        }
      }
    }
  }
}

// Used to join equally structured arrays. Can change type if passed type name. Also can change dates
function fuseEqualArrays(target, arr, typeChange = false) {
  const newArray = utils.copy(arr);
  for (const date of newArray) {
    const dateTarget = target.find(t => t.key === date.key);
    if (dateTarget) {
      for (const type of date.value) {
        const typeTarget = dateTarget.value.find(dt => dt.type === type.type);
        if (typeTarget) {
          for (const entry of type.value) {
            const targetEntry = typeTarget.value.find(
              tt =>
                tt.name === entry.name &&
                tt.url === entry.url &&
                tt.typeName === entry.typeName
            );
            if (!targetEntry) {
              typeTarget.value.push(entry);
            }
          }
        } else {
          dateTarget.value.push({
            type: typeChange || type.type,
            value: type.value
          });
        }
      }
    } else {
      if (typeChange) {
        for (const type of date.value) {
          type.type = typeChange;
        }
      }
      target.push({ key: date.key, value: date.value });
    }
  }
}

module.exports = renderDeprecatedNotes;
