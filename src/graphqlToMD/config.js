/**
 * CONSTANTS CONFIG
 */

var URL = 'https://api.travelgatex.com';
var DIRNAME = 'reference';
var PATH = '/travelgatex/';
var relURL = PATH + DIRNAME;
var LOCATION = __dirname + '/../output/reference';

var mdData = {};

var frontMatter = (title, pagetitle, description, weight, icon) =>
  JSON.stringify(
    {
      title: title,
      pagetitle: pagetitle,
      description: description,
      weight: weight || 1,
      icon: icon,
      alwaysopen: false
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
var DEPRECATED = frontMatter('Deprecated notes', null, '', 7, null);
var DELETED = frontMatter('Deleted notes', null, '', 8, null);

var QUERY = frontMatter('Query', null, '', 1, null);
var MUTATION = frontMatter('Mutation', null, '', 2, null);

var SECTION1 = 'GraphQL schema definition';
var SECTION2 = 'Fields';
var SECTION3 = 'Required by';

module.exports = {
  URL,
  LOCATION,
  DIRNAME,
  relURL,
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
