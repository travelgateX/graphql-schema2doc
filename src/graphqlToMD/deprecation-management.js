'use strict';
var config = require('./../config');
var fs = require('fs');
var utils = require('./utils');
var deepDiff = require('deep-diff');
var bar = require('./../../progressBar/bar');
var save = require('./save.js');

function renderDeprecatedNotes() {
  const deprecatedFields = [];

  for (const log of config.LOG) {
    estimateDeletionDate(log);
    const foundLog = deprecatedFields.length
      ? deprecatedFields.find(ol => ol.key === log.deprecationDate)
      : undefined;

    if (foundLog) {
      foundLog.value[0].value.push(log);
    } else {
      deprecatedFields.push({
        key: log.deprecationDate,
        value: [{ type: 'd', value: [log] }]
      });
    }
  }

  return new Promise(resolve =>
    checkDeprecatedDeletions(deprecatedFields).then(resolve)
  );
}

function checkDeprecatedDeletions(deprecatedFields) {
  return new Promise(resolve => {
    fs.readFile(
      __dirname +
        `/../deprecated-storage${config.currentKey}deleted-notes.json`,
      'utf8',
      (err, dn) => {
        let deletedNotes = [];
        if (dn) {
          deletedNotes = JSON.parse(dn);
        }
        // The name
        fs.readFile(
          __dirname +
            `/../deprecated-storage${config.currentKey}stored-deprecated.json`,
          'utf8',
          (err, stored) => {
            let storedData;
            if (stored) {
              storedData = JSON.parse(stored);
            }
            const difference = deepDiff.diff(storedData, deprecatedFields);
            // PRUEBAS
            // deprecatedFields['2017-11-21'][0] = {};
            //  console.log(deprecatedFields);
            // delete deprecatedFields['2018-03-19'];
            // const e = deprecatedFields
            //   .find(d => d.key === '2018-08-03')
            //   .value[0].value.splice(1);
            //   utils.log(deprecatedFields, 'prueba eliminado');

            // Check if there is a difference.
            // This package is capable of figuring out which may be the differences, yet it's method of comparison is not too clear
            // and seems to compare keys by index which is of no use in this case
            if (difference && storedData) {
              // Outer loop. Compares DATES
              for (const date of storedData) {
                const foundDeprecatedDate = deprecatedFields.find(
                  df => df.key === date.key
                );

                const noteIndex = deletedNotes.findIndex(
                  dn => dn.key === date.key
                );

                // If the key is no more, that means it and its contents have been removed.
                // Otherwise, we check if the property is equal between the stored data and the current one.
                // If it is different, we enter another loop and keep looking for differences
                if (!foundDeprecatedDate || !foundDeprecatedDate.value.length) {
                  const dateValue = date.value[0].value.map(v => {
                    v['trueDeletionDate'] = utils.formatDate(
                      config.CURRENT_DATE
                    );
                    return v;
                  });

                  // Key does not exist in deleted notes. It is created now

                  if (noteIndex !== -1) {
                    if (
                      !deletedNotes[noteIndex].value[0].value.find(dn => {
                        return (
                          dn &&
                          dateValue.find(
                            v =>
                              v &&
                              dn.name === v.name &&
                              dn.url === v.url &&
                              dn.deprecationDate === v.deprecationDate &&
                              dn.typeString === v.typeString &&
                              dn.typeName === v.typeName
                          )
                        );
                      })
                    ) {
                      deletedNotes[noteIndex].value[0].value.push(dateValue);
                    }
                  } else {
                    deletedNotes.push({
                      key: date.key,
                      value: [{ type: 'r', value: dateValue }]
                    });
                  }
                } else {
                  const storedEntries = storedData.find(
                    sd => sd.key === date.key
                  );

                  if (deepDiff.diff(storedEntries, foundDeprecatedDate)) {
                    for (const entry of storedEntries.value[0].value) {
                      // If entry of past data is not found in new data, it is added to deleted notes

                      if (
                        !foundDeprecatedDate.value[0].value.find(pd => {
                          return (
                            entry &&
                            pd &&
                            pd.name === entry.name &&
                            pd.url === entry.url &&
                            pd.deprecationDate === entry.deprecationDate &&
                            pd.typeString === entry.typeString &&
                            pd.typeName === entry.typeName
                          );
                        })
                      ) {
                        if (!deletedNotes[noteIndex]) {
                          entry['trueDeletionDate'] = utils.formatDate(
                            config.CURRENT_DATE
                          );
                          deletedNotes.push({
                            key: entry.deprecationDate,
                            value: [{ type: 'r', value: [entry] }]
                          });
                        } else if (
                          // IF not present already in deleted notes, info gets added
                          !deletedNotes[noteIndex].value[0].value.find(pd => {
                            return (
                              entry &&
                              pd &&
                              pd.name === entry.name &&
                              pd.url === entry.url &&
                              pd.deprecationDate === entry.deprecationDate &&
                              pd.typeString === entry.typeString &&
                              pd.typeName === entry.typeName
                            );
                          })
                        ) {
                          entry['trueDeletionDate'] = utils.formatDate(
                            config.CURRENT_DATE
                          );
                          deletedNotes[noteIndex].value[0].value.push(entry);
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

            saveDeprecatedNotesSnapshot(deprecatedFields, deletedNotes).then(resolve);
          }
        );
      }
    );
  });
}

/**
 * Saves the fields found to be deprecated right now based on the graphql-schema submodule,
 * and the fields that have been removed from the schema since the last execution.
 * @param {Array} deprecatedFields
 * @param {Array} deletedNotes
 */
function saveDeprecatedNotesSnapshot(deprecatedFields, deletedNotes) {
  const storedDeprecatedPromise = new Promise(resolve => {
    fs.writeFile(
      __dirname +
        `/../deprecated-storage${config.currentKey}stored-deprecated.json`,
      JSON.stringify(deprecatedFields, undefined, '  '),
      function(err) {
        if (err) return console.log(err);
        bar.tick();
        bar.interrupt('[Stored current deprecated and deleted notes]');
        resolve();
      }
    );
  });

  const deletedNotesPromise = new Promise(resolve => {
    fs.writeFile(
      __dirname +
        `/../deprecated-storage${config.currentKey}deleted-notes.json`,
      JSON.stringify(deletedNotes, undefined, '  '),
      function(err) {
        if (err) return console.log(err);
        bar.tick();
        bar.interrupt('[Stored deleted notes]');
        resolve();
      }
    );
  });

  return new Promise(resolve => {
    const lines = [];
    renderDeletedNotes(
      lines,
      deletedNotes,
      config.STRUCTURE.DELETED,
      utils.copy(deprecatedFields)
    );

    save
      .saveDeprecated(lines.join('\n'), `breaking-changes`)
      .then(_ => {
        Promise.all([storedDeprecatedPromise, deletedNotesPromise]).then(
          resolve
        );
      })
      .catch(_ => {
        Promise.all([storedDeprecatedPromise, deletedNotesPromise]).then(
          resolve
        );
      });
  });
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
  deprecatedFields
) {
  frontMatter = JSON.parse(frontMatter);
  frontMatter.hideGithubLink = true;
  lines.push(JSON.stringify(frontMatter, null, '\t'));
  lines.push(
    '\n{{% alert theme="info" %}}Changes history of deprecated notes previously announced{{% /alert %}}\n'
  );

  if (deletedNotes && deletedNotes.length) {
    let newDeletedNotesArr = [];
    // In the future, the array of items should contain sub arrays of different types of changes
    for (const date of deletedNotes) {
      for (const item of date.value[0].value) {
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

    const unreleasedNotes = formatUnreleasedNotes(deprecatedFields);

    // 12/07/2018 Recreate deleted as deprecated, so there can be seen properly on the timeline.
    const deletedAsDeprecated = [];
    recreateArrayAsType(deletedAsDeprecated, newDeletedNotesArr, 'd');

    // Duplicate deleted to also be present in the deprecated section
    fuseEqualArrays(newDeletedNotesArr, deletedAsDeprecated);

    // Duplicate deprecated to also be present in the unreleased section
    fuseEqualArrays(newDeletedNotesArr, unreleasedNotes);

    // Fuse deprecated entries with all the rest
    fuseEqualArrays(newDeletedNotesArr, deprecatedFields);

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
      if (date.key !== 99999999999999) {
        utils.printer(lines, `### ${date.key}`);
      } else {
        // Ordered unreleased by deletion date
        date.value[0].value = date.value[0].value
          .map(v => {
            v.deletionDateMilliseconds =
              v.daysRemaining === 'Already passed'
                ? 99999999999999
                : new Date(v.deletionDate).getTime();
            return v;
          })
          .sort((a, b) => {
            if (a.deletionDateMilliseconds < b.deletionDateMilliseconds)
              return 1;
            if (a.deletionDateMilliseconds > b.deletionDateMilliseconds)
              return -1;
            return 0;
          });
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
        dateInfo = `Expected removal on ${change.deletionDate}`;
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
      if (change.deletionDate) {
        additionalInfo = `Deprecated on ${change.deprecationDate}.`;
        additionalInfo +=
          change.daysRemaining && isNaN(change.daysRemaining)
            ? `**To be removed soon**`
            : `Expected removal on ${change.deletionDate}`;
      }
      break;
  }

  return `- ${keyword} \`${change.name}\` from \`${
    change.typeName
  }\`. Reason: ${change.deprecationReason}. ${dateInfo} ${additionalInfo}.`;
}

// this might replace the function of deprecation
function formatUnreleasedNotes(deprecatedFields) {
  // Those nines are a date waaaaay into the future
  let date_u = { key: 99999999999999, value: [{ type: 'u', value: [] }] };

  for (const date of deprecatedFields) {
    date_u.value[0].value = date_u.value[0].value.concat(date.value[0].value);
  }
  date_u = utils.copy(date_u);
  date_u.value[0].value.map(v => (v.subject = 'Removal of'));
  return [date_u];
}

// Clones an array of dates, changing their type to the specified one
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

function estimateDeletionDate(entry) {
  entry.deletionDate = 'unknown';
  entry.daysRemaining = 'unknown';
  if (entry.deprecationDate) {
    const date = new Date(
      new Date(entry.deprecationDate).getTime() + 7776000000
    );

    entry.deletionDate = utils.formatDate(date);

    entry.daysRemaining =
      new Date(entry.deletionDate).getTime() - new Date().getTime();
    if (entry.daysRemaining >= 0) {
      entry.daysRemaining = Math.floor(entry.daysRemaining / 86400000);
    } else {
      entry.daysRemaining = 'Already passed';
    }
  }
}

module.exports = renderDeprecatedNotes;
