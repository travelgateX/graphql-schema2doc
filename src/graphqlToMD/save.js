var fs = require('fs');
var config = require('./../config');

function saveFile(l, path) {
  let lines = l;
  if (path.includes('_index')) {
    const pathArray = path.split('/');
    if (pathArray.length === 1) {
      const position = config.MD_DATA['reference'].indexOf('pagetitle');
      const str = config.MD_DATA['reference'];
      lines = [
        str.slice(0, position - 1),
        `"hideGithubLink": true,\n\t`,
        str.slice(position - 1)
      ].join('');
    } else if (pathArray.length === 2 && config.MD_DATA[pathArray[0]]) {
      const position = config.MD_DATA[pathArray[0]].indexOf('pagetitle');
      const str = config.MD_DATA[pathArray[0]];
      lines = [
        str.slice(0, position - 1),
        `"hideGithubLink": true,\n\t`,
        str.slice(position - 1)
      ].join('');
    } else {
      console.log(path);
    }
  }

  fs.writeFile(`./../output/${path}.md`, lines, function(err) {
    if (err) {
      return console.log(err);
    }
  });
};

function saveDeprecated(l) {
  let lines = l;

  fs.writeFile(`${config.getDeprecatedNotesLocation()}`, lines, function(err) {
    if (err) {
      return console.log(err);
    }
  });
};

module.exports = {
  saveFile,
  saveDeprecated
}
