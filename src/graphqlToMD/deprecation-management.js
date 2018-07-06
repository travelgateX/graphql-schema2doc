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
    let deletionDate = 'unknown';
    let daysRemaining = 'unknown';
    if (l.deprecationDate) {
      const date = new Date(new Date(l.deprecationDate).getTime() + 7776000000);

      deletionDate = utils.formatDate(config.CURRENT_DATE);

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
  lines.push(JSON.stringify(frontMatter));
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
        __dirname + `/../deprecated-storage${config.PATH}stored-deprecated.json`,
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
    renderDeletedNotes(lines, deletedNotes, config.frontmatters.DELETED);
    saveFile(lines.join('\n'), `deleted_notes`);
  }
}

function renderDeletedNotes(lines, deletedNotes, frontMatter) {
  let deletedNotesArray = [];

  frontMatter = JSON.parse(frontMatter);
  frontMatter.hideGithubLink = true;
  lines.push(JSON.stringify(frontMatter));
  utils.printer(lines, `## Deletions`);

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
      tableContent += `|${deletedNote.trueDeletionDate}|[${deletedNote.name}](${
        deletedNote.url
      })|${deletedNote.typeName}|${deletedNote.deprecationReason}|\n`;
    }
    utils.printer(lines, table + tableLayout + tableContent);
  } else {
    utils.printer(lines, `### No deletions to date`);
  }
}

module.exports = renderDeprecatedNotes;
