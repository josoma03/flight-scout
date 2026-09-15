const { createHash } = require('node:crypto');

function parseIsoDate(value, fieldName) {
  const date = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}: ${value}. Expected YYYY-MM-DD.`);
  }

  return date;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatSkyscannerDate(dateString) {
  return dateString.slice(2, 4) + dateString.slice(5, 7) + dateString.slice(8, 10);
}

function generateDateRange(startDate, endDate) {
  const start = parseIsoDate(startDate, 'startDate');
  const end = parseIsoDate(endDate, 'endDate');

  if (start > end) {
    throw new Error('startDate must be before or equal to endDate.');
  }

  const dates = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    dates.push(formatDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function createConfigSignature(config) {
  return createHash('sha1')
    .update(
      JSON.stringify({
        origin: config.origin,
        destination: config.destination,
        startDate: config.startDate,
        endDate: config.endDate,
        adults: config.adults,
        currency: config.currency,
      }),
    )
    .digest('hex');
}

function extractPriceValue(priceText) {
  const text = normalizeText(priceText);
  if (!text) {
    return Number.POSITIVE_INFINITY;
  }

  const numeric = text.replace(/[^\d.,]/g, '');
  if (!numeric) {
    return Number.POSITIVE_INFINITY;
  }

  const lastComma = numeric.lastIndexOf(',');
  const lastDot = numeric.lastIndexOf('.');
  const decimalIndex = Math.max(lastComma, lastDot);

  let normalized;
  if (decimalIndex === -1) {
    normalized = numeric.replace(/[.,]/g, '');
  } else {
    const integerPart = numeric.slice(0, decimalIndex).replace(/[.,]/g, '');
    const decimalPart = numeric.slice(decimalIndex + 1).replace(/[.,]/g, '');
    normalized = `${integerPart}.${decimalPart}`;
  }

  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function buildFlightKey(flight) {
  return [
    normalizeText(flight.date),
    normalizeText(flight.origin).toUpperCase(),
    normalizeText(flight.destination).toUpperCase(),
    normalizeText(flight.departureTime),
    normalizeText(flight.arrivalTime),
    normalizeText(flight.duration),
    normalizeText(flight.numberOfStops),
    normalizeText(flight.stopLocations).toUpperCase(),
    normalizeText(flight.airlines).toUpperCase(),
    normalizeText(flight.price).toUpperCase(),
  ].join('|');
}

function dedupeFlights(flights) {
  const seen = new Set();
  const uniqueFlights = [];

  for (const flight of flights) {
    const key = buildFlightKey(flight);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueFlights.push(flight);
  }

  return uniqueFlights;
}

function sortFlights(flights) {
  return [...flights].sort((left, right) => {
    if (left.date !== right.date) {
      return left.date.localeCompare(right.date);
    }

    const priceDiff = extractPriceValue(left.price) - extractPriceValue(right.price);
    if (priceDiff !== 0) {
      return priceDiff;
    }

    return buildFlightKey(left).localeCompare(buildFlightKey(right));
  });
}

function escapeCsv(value) {
  const text = normalizeText(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(flights) {
  const headers = [
    'date',
    'origin',
    'destination',
    'departureTime',
    'arrivalTime',
    'duration',
    'numberOfStops',
    'stopLocations',
    'airlines',
    'price',
  ];

  const rows = flights.map((flight) =>
    headers.map((header) => escapeCsv(flight[header] ?? '')).join(','),
  );

  return [headers.join(','), ...rows].join('\n');
}

module.exports = {
  buildFlightKey,
  createConfigSignature,
  dedupeFlights,
  escapeCsv,
  extractPriceValue,
  formatDate,
  formatSkyscannerDate,
  generateDateRange,
  normalizeText,
  parseIsoDate,
  sleep,
  sortFlights,
  toCsv,
};
