/**
 * CONSTANTS CONFIG
 */

var URL = 'https://api.travelgatex.com';
var DIRNAME = 'reference';
// Default
var PATH = '/travelgatex/';
var relURL = PATH + DIRNAME;
var LOCATION = __dirname + '/../output/reference';

const LOG = [];
const CURRENT_DATE = new Date();

let MD_DATA = {};

var frontMatter = (title, pagetitle, description, weight, icon, tags = []) =>
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

var INDEX = frontMatter(
  'Reference',
  'Reference Documentation',
  'Reference Documentation',
  2,
  'fa-book'
);
var INDEXSCHEMA = frontMatter('Schema', null, '', 1, null);
var INDEXOBJECTS = frontMatter('Objects', null, '', 2, null);
var INDEXSCALARS = frontMatter('Scalars', null, '', 3, null);
var INDEXINTERFACES = frontMatter('Interfaces', null, '', 4, null);
var INDEXINPUTOBJECTS = frontMatter('Input objects', null, '', 5, null);
var INDEXENUMS = frontMatter('Enums', null, '', 6, null);
var DEPRECATED = frontMatter(
  'Deprecated Schema Notes',
  'Deprecated schema notes',
  'Changes that can break existing queries to the GraphQL API. For example, removing a field would be a breaking change',
  7,
  'fa-exclamation-triangle',
  ["deprecated-notes"]
);
var DELETED = frontMatter(
  'Deleted Schema Notes',
  'Deleted schema notes',
  'Changes history of deprecated notes previously announced',
  8,
  'fa-eraser',
  ['deleted-notes']
);

var QUERY = frontMatter('Query', null, '', 1, null);
var MUTATION = frontMatter('Mutation', null, '', 2, null);

var SECTION1 = 'GraphQL schema definition';
var SECTION2 = 'Fields';
var SECTION3 = 'Required by';

module.exports = {
  URL,
  LOG,
  CURRENT_DATE,
  MD_DATA,
  LOCATION,
  DIRNAME,
  relURL,
  PATH,
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
  SECTION3
};
