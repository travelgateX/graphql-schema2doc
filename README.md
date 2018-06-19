# TravelgateX GraphQL Schema 2 Documentation


## Getting Started

These instructions will help you to extend and modify the current gateway schema.

###  Packages Instalation

These packages should be listed in the package.json. Running ```npm i``` shoyld be enough to install them. You can also install them with the following commands

```npm i glob```

```npm i async```

```npm i graphql-tools```

```npm i node-fetch```

```npm i httpcheck```

The `graphql-schema` repo is necessary to run the script. Make sure to pull from it when you first clone this repo, otherwise the script will not work. Also, port 9002 must be free in order to set up a temporary endpoint to fetch the data.

Once everything is ready, just run the index.js script inside src. It will generate a folder called "reference".