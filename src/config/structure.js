const frontMatter = (title, pagetitle, description, weight, icon, tags = []) =>
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

module.exports = {
  INDEX: frontMatter(
    'Reference',
    'Reference Documentation',
    'Reference Documentation',
    2,
    'fa-book'
  ),
  INDEXSCHEMA: frontMatter('Schema', null, '', 1, null),
  INDEXOBJECTS: frontMatter('Objects', null, '', 2, null),
  INDEXSCALARS: frontMatter('Scalars', null, '', 3, null),
  INDEXINTERFACES: frontMatter('Interfaces', null, '', 4, null),
  INDEXINPUTOBJECTS: frontMatter('Input objects', null, '', 5, null),
  INDEXENUMS: frontMatter('Enums', null, '', 6, null),
  DEPRECATED: frontMatter(
    'Deprecated Schema Notes',
    'Deprecated schema notes',
    'Changes that can break existing queries to the GraphQL API. For example, removing a field would be a breaking change',
    4,
    'fa-exclamation-triangle',
    ['deprecated-notes']
  ),
  DELETED: frontMatter(
    'GraphQL Schema breaking changes',
    'GraphQL Schema breaking changes',
    'Changes history of deprecated notes previously announced',
    5,
    'fa-eraser',
    ['breaking-changes']
  ),

  QUERY: frontMatter('Query', null, '', 1, null),
  MUTATION: frontMatter('Mutation', null, '', 2, null),

  SECTION1: 'GraphQL schema definition',
  SECTION2: 'Fields',
  SECTION3: 'Required by'
};
