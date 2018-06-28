const fetch = require('node-fetch'),
  query = require(__dirname + '/resources/query').query,
  check = require('httpcheck');

function main() {
  const body = {
    operationName: 'IntrospectionQuery',
    query: query,
    variable: null
  };
  const promise = new Promise(function(resolve) {
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
          console.log('HTTP check for example.com failed!');
          throw err;
        }
        console.log('HTTP check for example.com has passed');
      }
    );
  });

  return promise;
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
