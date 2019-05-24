# TravelgateX GraphQL Schema 2 Documentation


## Getting Started

Follow these instructions to be able to run this project.

### Install Node.js
In order to be able to run the scripts on this project, you need to have node installed. You can download it from [here](https://nodejs.org/es/download/). If you are working with linux, you might need to also install npm independently. Once installed, make sure to add npm to PATH variables.   

### Install GraphQL Faker
This project relies on GraphQL Faker to be able to create the schemas. Now for use it correctly you need use a graphql-faker from our repository, this is updated to the latest version of graphql

https://github.com/amian84/graphql-faker

For use this, you need local clone the repository, checkout to 'distFolder' branch, and execute

sudo npm link


if you have another version installed please remove before.

### Download dependencies
These packages should be listed in the package.json. Running ```npm i``` will install all the required dependencies.

### Update the submodules
The `graphql-schema` repo is required to run the script. Make sure to pull from it when you first clone this repo using this command `git submodule update --init --recursive`, otherwise the script will not work. Also, port 9002 must be free in order to set up a temporary endpoint to fetch the data.

### Set folder permissions
This project will create folders, subfolders and files. Make sure the folder has all the required permissions


## Running the scripts

Once everything is ready, just run the index.js script inside src. If everything goes as expected, a folder called "reference"  will be generated inside the `documentation-site` project, in the category chosen by the user. By default, this project assumes that it and `documentation-site` are on the same folder. If you want to have them on different folders, you will have to modify the configurations by hand.