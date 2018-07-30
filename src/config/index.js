const PATHS = require('./paths'),
  STRUCTURE = require('./structure'),
  USER_CONFIG = require('./user_config');

const URL = 'https://api.travelgatex.com';
const DOCUMENTATION_LOCATION = `${__dirname}/../../../documentation-site/`;
const LOG = [];
const CURRENT_DATE = new Date();

let MD_DATA = {};

let ALL_SCHEMAS = false;
let currentKey = '';

module.exports = {
  URL,
  LOG,
  CURRENT_DATE,
  MD_DATA,
  STRUCTURE,
  PATHS,
  USER_CONFIG,
  ALL_SCHEMAS,
  DOCUMENTATION_LOCATION,
  currentKey
};
