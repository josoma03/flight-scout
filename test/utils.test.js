const test = require('node:test');
const assert = require('node:assert/strict');
const {
  dedupeFlights,
  extractPriceValue,
  formatSkyscannerDate,
  generateDateRange,
  sortFlights,
  toCsv,
} = require('../src/utils');

test('generateDateRange returns an inclusive list of dates', () => {
  assert.deepEqual(generateDateRange('2026-10-01', '2026-10-03'), [
    '2026-10-01',
    '2026-10-02',
    '2026-10-03',
  ]);
});

test('generateDateRange rejects impossible calendar dates', () => {
  assert.throws(
    () => generateDateRange('2026-02-30', '2026-03-01'),
    /Invalid startDate: 2026-02-30/,
  );
});

test('formatSkyscannerDate converts ISO dates to Skyscanner format', () => {
  assert.equal(formatSkyscannerDate('2026-10-03'), '261003');
});

test('dedupeFlights removes duplicate itinerary records', () => {
  const flights = [
    {
      date: '2026-10-01',
      origin: 'MLA',
      destination: 'CUN',
      departureTime: '08:00',
      arrivalTime: '14:00',
      duration: '10h',
      numberOfStops: '1',
      stopLocations: 'MAD',
      airlines: 'Example Air',
      price: '$500',
    },
    {
      date: '2026-10-01',
      origin: 'mla',
      destination: 'cun',
      departureTime: '08:00',
      arrivalTime: '14:00',
      duration: '10h',
      numberOfStops: '1',
      stopLocations: 'mad',
      airlines: 'Example Air',
      price: '$500',
    },
  ];

  assert.equal(dedupeFlights(flights).length, 1);
});

test('sortFlights orders by date and numeric price', () => {
  const flights = [
    { date: '2026-10-02', price: '$300', origin: 'A', destination: 'B', departureTime: '10:00', arrivalTime: '12:00', duration: '2h', numberOfStops: '0', stopLocations: '', airlines: 'X' },
    { date: '2026-10-01', price: '$500', origin: 'A', destination: 'B', departureTime: '10:00', arrivalTime: '12:00', duration: '2h', numberOfStops: '0', stopLocations: '', airlines: 'X' },
    { date: '2026-10-01', price: '$200', origin: 'A', destination: 'B', departureTime: '09:00', arrivalTime: '11:00', duration: '2h', numberOfStops: '0', stopLocations: '', airlines: 'Y' },
  ];

  assert.deepEqual(
    sortFlights(flights).map((flight) => `${flight.date}-${flight.price}`),
    ['2026-10-01-$200', '2026-10-01-$500', '2026-10-02-$300'],
  );
});

test('extractPriceValue handles different separators', () => {
  assert.equal(extractPriceValue('$1,234.56'), 1234.56);
  assert.equal(extractPriceValue('EUR 1.234,56'), 1234.56);
});

test('toCsv escapes commas and quotes', () => {
  const csv = toCsv([
    {
      date: '2026-10-01',
      origin: 'MLA',
      destination: 'CUN',
      departureTime: '08:00',
      arrivalTime: '14:00',
      duration: '10h',
      numberOfStops: '1',
      stopLocations: 'MAD, LIS',
      airlines: 'Air "Example"',
      price: '$500',
    },
  ]);

  assert.match(csv, /"MAD, LIS"/);
  assert.match(csv, /"Air ""Example"""/);
});
