const fetch = require('node-fetch'),
  query = require(__dirname + '/query').query,
  check = require('httpcheck'),
  bar = require(__dirname + '/../../progressBar/bar');

function main() {
  const body = {
    operationName: 'IntrospectionQuery',
    query: query,
    variable: null
  };
  return new Promise(resolve => {
    check(
      {
        url: 'http://localhost:9002/graphql',
        checkTries: 100,
        checkInterval: 500,
        checkTimeout: 50000,
        check(res) {
          if (res && res.statusCode === 404) {
            return true;
          } else if (res) {
            fetchSchemaJSON(body).then(r => resolve(r));
            return true;
          }
        }
      },
      function(err) {
        if (err) {
          bar.interrupt('[HTTP check for example.com failed!]');
          throw err;
        }
        bar.tick();
        bar.interrupt('[HTTP check for example.com has passed]');
      }
    );
  });
}

function fetchSchemaJSON(body) {
  return fetch('http://localhost:9002/graphql', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
    .then(res => res.json())
    .then(result => result.data);
}

module.exports = main;
