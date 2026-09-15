const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const { chromium } = require('playwright');
const { formatSkyscannerDate, normalizeText, sleep } = require('./utils');

const RESULT_CARD_SELECTORS = [
  '[data-test-id="offer-listing"]',
  '[data-test-id="itinerary-card"]',
  '[data-testid="offer-listing"]',
  '[class*="FlightCard"]',
  '[class*="day-list-item"]',
];

const FIELD_SELECTORS = {
  departureTime: [
    '[data-test-id="departure-time"]',
    '[data-testid="departure-time"]',
    '[class*="LegInfo_routePartialTime"]:first-child',
  ],
  arrivalTime: [
    '[data-test-id="arrival-time"]',
    '[data-testid="arrival-time"]',
    '[class*="LegInfo_routePartialTime"]:last-child',
  ],
  duration: [
    '[data-test-id="duration"]',
    '[data-testid="duration"]',
    '[class*="LegInfo_stopsLabel"]',
  ],
  numberOfStops: [
    '[data-test-id="stops"]',
    '[data-testid="stops"]',
    '[class*="LegInfo_stopsLabel"]',
  ],
  stopLocations: [
    '[data-test-id="stop-locations"]',
    '[data-testid="stop-locations"]',
    '[class*="LegInfo_stopsContainer"]',
  ],
  airlines: [
    '[data-test-id="carriers"]',
    '[data-testid="carriers"]',
    '[class*="LegInfo_carriers"]',
    '[class*="FlightsTicket_carrier"]',
  ],
  price: [
    '[data-test-id="price"]',
    '[data-test-id="listing-price-dollars"]',
    '[data-testid="price"]',
    '[class*="Price_mainPriceContainer"]',
    '[class*="Price_price"]',
  ],
};

function buildSearchUrl(config, date) {
  const url = new URL(
    `https://www.skyscanner.net/transport/flights/${config.origin.toLowerCase()}/${config.destination.toLowerCase()}/${formatSkyscannerDate(date)}/`,
  );

  url.searchParams.set('adultsv2', String(config.adults));
  url.searchParams.set('cabinclass', 'economy');
  url.searchParams.set('currency', config.currency);
  url.searchParams.set('locale', config.locale);
  url.searchParams.set('market', config.market);
  url.searchParams.set('preferdirects', 'false');
  url.searchParams.set('outboundaltsenabled', 'false');
  url.searchParams.set('inboundaltsenabled', 'false');
  url.searchParams.set('rtn', '0');

  return url.toString();
}

async function isVerificationPage(page) {
  const text = normalizeText(await page.locator('body').innerText().catch(() => ''));
  return /captcha|verify you are human|security check|unusual traffic|confirm you are a human/i.test(text);
}

async function waitForManualVerification(page) {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    while (await isVerificationPage(page)) {
      console.log('\nVerification page detected. Resolve it manually in the browser window.');
      await rl.question('Press Enter after the verification challenge is solved... ');
      await page.waitForTimeout(2000);
    }
  } finally {
    rl.close();
  }
}

async function waitForResults(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

  await page
    .waitForFunction(
      ({ selectors }) => {
        const bodyText = (document.body?.innerText || '').toLowerCase();
        if (bodyText.includes('no flights found') || bodyText.includes('no results found')) {
          return true;
        }

        return selectors.some((selector) => document.querySelector(selector));
      },
      { selectors: RESULT_CARD_SELECTORS },
      { timeout: 45000 },
    )
    .catch(async () => {
      if (await isVerificationPage(page)) {
        return;
      }

      throw new Error('Timed out waiting for flight results to load.');
    });
}

async function extractFlightsFromPage(page, context) {
  return page.evaluate(
    ({ cardSelectors, fieldSelectors, context }) => {
      const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();

      const firstText = (root, selectors) => {
        for (const selector of selectors) {
          const element = root.querySelector(selector);
          const text = normalize(element?.textContent || '');
          if (text) {
            return text;
          }
        }
        return '';
      };

      const parseStops = (text) => {
        const normalized = normalize(text);
        if (!normalized) {
          return '';
        }
        if (/direct|non[- ]?stop/i.test(normalized)) {
          return '0';
        }
        const match = normalized.match(/(\d+)\s+stop/i);
        return match ? match[1] : normalized;
      };

      const parseStopLocations = (text) => {
        const normalized = normalize(text);
        if (!normalized || /direct|non[- ]?stop/i.test(normalized)) {
          return '';
        }

        const viaMatch = normalized.match(/via\s+(.+)/i);
        if (viaMatch) {
          return normalize(viaMatch[1]);
        }

        return normalized;
      };

      const textFromCard = (card) => normalize(card.innerText || card.textContent || '');

      const parseTimes = (text) => {
        const matches = [...text.matchAll(/\b\d{1,2}:\d{2}\b/g)].map((match) => match[0]);
        return {
          departureTime: matches[0] || '',
          arrivalTime: matches[1] || '',
        };
      };

      const parseDuration = (text) => normalize(text.match(/\b\d+h(?:\s*\d+m)?\b/i)?.[0] || '');
      const parsePrice = (text) => normalize(text.match(/(?:[A-Z]{3}\s*)?[€$£]\s?[\d.,]+|[€$£]\s?[\d.,]+|[\d.,]+\s?(?:USD|EUR|GBP)/i)?.[0] || '');

      const cards = cardSelectors.flatMap((selector) => [...document.querySelectorAll(selector)]);
      const uniqueCards = [...new Set(cards)];

      return uniqueCards.map((card) => {
        const fullText = textFromCard(card);
        const selectorDepartureTime = firstText(card, fieldSelectors.departureTime);
        const selectorArrivalTime = firstText(card, fieldSelectors.arrivalTime);
        const selectorDuration = firstText(card, fieldSelectors.duration);
        const selectorStops = firstText(card, fieldSelectors.numberOfStops);
        const selectorStopLocations = firstText(card, fieldSelectors.stopLocations);
        const selectorAirlines = firstText(card, fieldSelectors.airlines);
        const selectorPrice = firstText(card, fieldSelectors.price);
        const fallbackTimes = parseTimes(fullText);

        const departureTime = selectorDepartureTime || fallbackTimes.departureTime;
        const arrivalTime = selectorArrivalTime || fallbackTimes.arrivalTime;
        const duration = selectorDuration || parseDuration(fullText);
        const stopsText = selectorStops || fullText;
        const stopLocationsText = selectorStopLocations || fullText;
        const airlines = selectorAirlines || '';
        const price = selectorPrice || parsePrice(fullText);

        return {
          date: context.date,
          origin: context.origin,
          destination: context.destination,
          departureTime,
          arrivalTime,
          duration,
          numberOfStops: parseStops(stopsText),
          stopLocations: parseStopLocations(stopLocationsText),
          airlines,
          price,
        };
      }).filter((flight) => flight.departureTime && flight.arrivalTime && flight.price);
    },
    {
      cardSelectors: RESULT_CARD_SELECTORS,
      fieldSelectors: FIELD_SELECTORS,
      context,
    },
  );
}

async function scrapeFlights(config, progress, onDateProcessed) {
  const browser = await chromium.launch({ headless: config.headless });
  const page = await browser.newPage();
  const processedDates = new Set(progress.processedDates || []);
  let flights = Array.isArray(progress.flights) ? [...progress.flights] : [];

  try {
    for (const date of config.dates) {
      if (processedDates.has(date)) {
        continue;
      }

      const url = buildSearchUrl(config, date);
      console.log(`Searching ${config.origin} -> ${config.destination} for ${date}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

      if (await isVerificationPage(page)) {
        await waitForManualVerification(page);
      }

      await waitForResults(page);
      const extractedFlights = await extractFlightsFromPage(page, {
        date,
        origin: config.origin,
        destination: config.destination,
      });

      flights = flights.concat(extractedFlights);
      processedDates.add(date);

      if (onDateProcessed) {
        await onDateProcessed({
          date,
          flights,
          processedDates: [...processedDates],
          extractedFlights,
        });
      }

      console.log(`Captured ${extractedFlights.length} flights for ${date}`);
      if (config.searchDelayMs > 0 && date !== config.dates[config.dates.length - 1]) {
        await sleep(config.searchDelayMs);
      }
    }

    return {
      flights,
      processedDates: [...processedDates],
    };
  } finally {
    await browser.close();
  }
}

module.exports = {
  buildSearchUrl,
  extractFlightsFromPage,
  isVerificationPage,
  scrapeFlights,
  waitForManualVerification,
  waitForResults,
};
