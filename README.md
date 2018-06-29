# TravelgateX GraphQL Schema 2 Documentation


## Getting Started

Follow these instructions to be able to run this project.

### Install Node.js
In order to be able to run the scripts on this project, you need to have node installed. You can download it from [here](https://nodejs.org/es/download/). Once installed, make sure to add npm to PATH variables.   


### Download dependencies
These packages should be listed in the package.json. Running ```npm i``` should be enough to install them. You can also install them with the following commands

```npm i glob```
```npm i async```
```npm i graphql-tools```
```npm i node-fetch```
```npm i httpcheck```

### Update the submodules
The `graphql-schema` repo is necessary to run the script. Make sure to pull from it when you first clone this repo using this command `git submodule update --init --recursive`, otherwise the script will not work. Also, port 9002 must be free in order to set up a temporary endpoint to fetch the data.

## Running the scripts

Once everything is ready, just run the index.js script inside src. If everything is fine, it will generate a folder called "reference" inside "output", which must be moved to `documentation-site`, inside `travelgateX`.