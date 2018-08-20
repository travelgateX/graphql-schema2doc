const ProgressBar = require('progress');

const bar = new ProgressBar('  Running scripts [:bar] :rate/bps :percent :etas', {
    complete: '=',
    incomplete: '.',
    width: 50,
    total: 14
  });

module.exports = bar;


