const DIRNAME = 'reference';

module.exports = {
  '/travelgatex/': {
    relURL: `/travelgatex/${DIRNAME}`,
    rootItems: [{ name: 'Query' }, { name: 'Mutation' }],
    deprecatedUrl: `${__dirname}/../output/travelgatex/breaking-changes.md`,
    enabled: false
  },
  '/hotel-x/': {
    relURL: `/hotel-x/${DIRNAME}`,
    rootItems: [{ name: 'HotelXQuery' }, { name: 'HotelXMutation' }],
    deprecatedUrl: `${__dirname}/../output/hotel-x/breaking-changes.md`,
    enabled: false
  },
  '/paymentx/': {
    relURL: `/paymentx/${DIRNAME}`,
    rootItems: [{ name: 'PaymentXQuery' }, { name: 'PaymentXMutation' }],
    deprecatedUrl: `${__dirname}/../output/paymentx/breaking-changes.md`,
    enabled: false
  },
  '/mappea/': {
    relURL: `/mappea/${DIRNAME}`,
    rootItems: [{ name: 'MappeaQuery' }, { name: 'MappeaMutation' }],
    deprecatedUrl: `${__dirname}/../output/mappea/breaking-changes.md`,
    enabled: false
  },
  '/stats/': {
    relURL: `/stats/${DIRNAME}`,
    rootItems: [{ name: 'StatsQuery' }],
    deprecatedUrl: `${__dirname}/../output/stats/breaking-changes.md`,
    enabled: false
  },
  '/alerts-x/': {
    relURL: `/alerts-x/${DIRNAME}`,
    rootItems: [{ name: 'AlertsXQuery' }, { name: 'AlertsXMutation' }],
    deprecatedUrl: `${__dirname}/../output/alerts-x/breaking-changes.md`,
    enabled: false
  }
};
