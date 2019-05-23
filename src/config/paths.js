const DIRNAME = 'reference';

module.exports = {
  '/travelgatex/': {
    relURL: `/travelgatex/${DIRNAME}`,
    rootItems: [{ name: 'Query' }, { name: 'Mutation' }],
    deprecatedUrl: `${__dirname}/../output/travelgatex/breaking-changes.md`,
    enabled: false
  },
  '/hotelx/': {
    relURL: `/hotelx/${DIRNAME}`,
    rootItems: [{ name: 'HotelXQuery' }, { name: 'HotelXMutation' }],
    deprecatedUrl: `${__dirname}/../output/hotelx/breaking-changes.md`,
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
  '/alertsx/': {
    relURL: `/alertsx/${DIRNAME}`,
    rootItems: [{ name: 'AlertsXQuery' }, { name: 'AlertsXMutation' }],
    deprecatedUrl: `${__dirname}/../output/alertsx/breaking-changes.md`,
    enabled: false
  }
};
