module.exports = {
  main: main
};

const prompt = require('child_process').exec,
  { printMockerHelp } = require('./help'),
  fs = require('fs'),
  bar = require(__dirname + '/../progressBar/bar');

function main(schemaPath, callback, port, extend) {
  //If --h/--help, show help and exit

  if (schemaPath === '--h' || schemaPath === '--help') {
    printFakerHelp();
    return;
  }

  var command = 'graphql-faker ' + schemaPath;
  //Add options
  command = port ? command + ' -p ' + port : command;
  command = extend ? command + ' -e ' + extend : command;

  const promptExec = prompt(command, function(err, stdout, stderr) {});

  promptExec.stdout.on('data', function(data) {
    bar.tick();
    bar.interrupt('[Faker data ready]');
    setTimeout(_ => promptExec.kill(), 0);
  });

  promptExec.on('close', function(code) {
    bar.tick();
    bar.interrupt('[Faker connection ended]');
  });

  promptExec.on('error', function(code) {
    console.log('____error____');
  });
}
