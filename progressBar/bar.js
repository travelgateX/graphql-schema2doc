const ProgressBar = require('progress');

const bar = new ProgressBar('  Running scripts [:bar] :rate/bps :percent :etas', {
    complete: '=',
    incomplete: ' ',
    width: 20,
    total: 16
  });

module.exports = bar;


