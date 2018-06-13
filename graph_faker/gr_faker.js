module.exports = {
  main: main
};

const prompt = require('child_process').exec;
const { printMockerHelp } = require('./help');
const fs = require('fs');

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
    // promptExec.kill('SIGHUP');
    console.log('____data____');
    setTimeout(_=>promptExec.kill(), 5000);
  });

  promptExec.on('close', function(code) {
    console.log('____close____');
  });

  promptExec.on('error', function(code) {
    console.log('____error____');
  });
}
