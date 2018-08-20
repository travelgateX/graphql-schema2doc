var fs = require('fs');
var config = require('./../config');

function saveFile(l, path) {
  let lines = l;
  if (path.includes('_index')) {
    const pathArray = path.split('/');
    if (pathArray.length === 3) {
      const position = config.MD_DATA['reference'].indexOf('pagetitle');
      const str = config.MD_DATA['reference'];
      lines = [
        str.slice(0, position - 1),
        `"hideGithubLink": true,\n\t`,
        str.slice(position - 1)
      ].join('');
    } else if (pathArray.length === 4 && config.MD_DATA[pathArray[2]]) {
      const position = config.MD_DATA[pathArray[2]].indexOf('pagetitle');
      const str = config.MD_DATA[pathArray[2]];
      lines = [
        str.slice(0, position - 1),
        `"hideGithubLink": true,\n\t`,
        str.slice(position - 1)
      ].join('');
    } else {
      
    }
  }
  return new Promise((resolve, reject) => {
    fs.writeFile(`${__dirname}/../output/${path}.md`, lines, function(err) {
      if (err) {
        console.log(err);
        reject();
      }
      resolve();
    });
  });
}

function saveDeprecated(l) {
  let lines = l;

  return new Promise((resolve, reject) => {
    fs.writeFile(
      `${config.PATHS[config.currentKey].deprecatedUrl}`,
      lines,
      function(err) {
        if (err) {
          console.log(err);
          reject();
        }
        resolve();
      }
    );
  });
}

module.exports = {
  saveFile,
  saveDeprecated
};
