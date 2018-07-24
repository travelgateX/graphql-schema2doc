/**
 * CONSTANTS CONFIG
 */

let URL = 'https://api.travelgatex.com';
let DIRNAME = 'reference';
// Default
let PATH = '/travelgatex/';
let relURL = PATH + DIRNAME;
let LOCATION = `${__dirname}/../../../documentation-site/content${PATH}/reference`;
let DEPRECATED_NOTES_LOCATION = `${__dirname}/../../../documentation-site/content${PATH}/release-notes/breaking-changes.md`;

const resetLocations = newPath => {
  PATH = newPath;
  relURL = PATH + DIRNAME;
  LOCATION = `${__dirname}/../../../documentation-site/content${PATH}/reference`;
  DEPRECATED_NOTES_LOCATION = `${__dirname}/../../../documentation-site/content${PATH}/release-notes/breaking-changes.md`;
};

const getPath = _=> PATH;
const getRelUrl = _ => relURL;
const getLocation = _=>LOCATION;
const getDeprecatedNotesLocation = _=>  DEPRECATED_NOTES_LOCATION;

const LOG = [];
const CURRENT_DATE = new Date();

let MD_DATA = {};

let SCHEMA_OPTIONS = [];

let frontMatter = (title, pagetitle, description, weight, icon, tags = []) =>
  JSON.stringify(
    {
      title: title,
      pagetitle: pagetitle,
      description: description,
      weight: weight || 1,
      icon: icon,
      alwaysopen: false,
      tags: tags
    },
    null,
    2
  );

let INDEX = frontMatter(
  'Reference',
  'Reference Documentation',
  'Reference Documentation',
  2,
  'fa-book'
);
let INDEXSCHEMA = frontMatter('Schema', null, '', 1, null);
let INDEXOBJECTS = frontMatter('Objects', null, '', 2, null);
let INDEXSCALARS = frontMatter('Scalars', null, '', 3, null);
let INDEXINTERFACES = frontMatter('Interfaces', null, '', 4, null);
let INDEXINPUTOBJECTS = frontMatter('Input objects', null, '', 5, null);
let INDEXENUMS = frontMatter('Enums', null, '', 6, null);
let DEPRECATED = frontMatter(
  'Deprecated Schema Notes',
  'Deprecated schema notes',
  'Changes that can break existing queries to the GraphQL API. For example, removing a field would be a breaking change',
  4,
  'fa-exclamation-triangle',
  ['deprecated-notes']
);
let DELETED = frontMatter(
  'GraphQL Schema breaking changes',
  'GraphQL Schema breaking changes',
  'Changes history of deprecated notes previously announced',
  5,
  'fa-eraser',
  ['breaking-changes']
);

let QUERY = frontMatter('Query', null, '', 1, null);
let MUTATION = frontMatter('Mutation', null, '', 2, null);

let SECTION1 = 'GraphQL schema definition';
let SECTION2 = 'Fields';
let SECTION3 = 'Required by';

module.exports = {
  URL,
  LOG,
  CURRENT_DATE,
  MD_DATA,
  SCHEMA_OPTIONS,
  frontmatters: {
    frontMatter,
    INDEX,
    INDEXOBJECTS,
    INDEXSCHEMA,
    INDEXSCALARS,
    INDEXINTERFACES,
    INDEXINPUTOBJECTS,
    INDEXENUMS,
    QUERY,
    MUTATION,
    DEPRECATED,
    DELETED
  },
  SECTION1,
  SECTION2,
  SECTION3,
  resetLocations,
  getPath,
  getLocation,
  getRelUrl,
  getDeprecatedNotesLocation,
  DEPRECATED_NOTES_LOCATION
};
