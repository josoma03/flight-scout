# FlightScout

FlightScout is a Node.js + Playwright flight search utility that searches Skyscanner across a date range, collects one-way flight results, saves progress between runs, removes duplicates, and exports the final data to JSON and CSV.

## Requirements

- Node.js 22+ (Node.js 18+ should also work)
- npm
- Chromium installed for Playwright

## Installation

```bash
npm install
npx playwright install chromium
```

## Configuration

Edit `config.json` in the project root:

```json
{
  "origin": "MLA",
  "destination": "CUN",
  "startDate": "2026-10-01",
  "endDate": "2026-10-03",
  "adults": 1,
  "currency": "USD",
  "searchDelayMs": 5000,
  "headless": false,
  "locale": "en-US",
  "market": "US"
}
```

### Required fields

- `origin`: origin airport IATA code
- `destination`: destination airport IATA code
- `startDate`: first search date in `YYYY-MM-DD`
- `endDate`: last search date in `YYYY-MM-DD`
- `adults`: number of adults
- `currency`: 3-letter currency code

### Optional fields

- `searchDelayMs`: delay between searches in milliseconds
- `headless`: defaults to `false`, so Chromium runs in headed mode
- `locale`: Skyscanner locale, defaults to `en-US`
- `market`: Skyscanner market, defaults to `US`

## Usage

Start the scraper with:

```bash
npm start
```

FlightScout will:

1. Generate every date between `startDate` and `endDate`
2. Open Skyscanner in Chromium
3. Search one-way flights for each date
4. Wait for results to load before extraction
5. Save progress after each processed date in `output/progress.json`
6. Resume from saved progress when the configuration matches the previous run
7. Export sorted unique results to JSON and CSV

## CAPTCHA / verification handling

If Skyscanner shows a CAPTCHA or verification screen, FlightScout does **not** attempt to bypass it. The script pauses and waits for you to solve it manually in the visible browser window before continuing.

## Output format

Generated files are written to `output/`:

- `output/progress.json`: resumable progress checkpoint
- `output/flights.json`: final structured result set
- `output/flights.csv`: final CSV export

Each flight record contains:

- `date`
- `origin`
- `destination`
- `departureTime`
- `arrivalTime`
- `duration`
- `numberOfStops`
- `stopLocations`
- `airlines`
- `price`

Results are deduplicated and sorted by date, then by price.

## Project structure

```text
src/
  index.js
  scraper.js
  storage.js
  config.js
  utils.js
test/
  utils.test.js
output/
  .gitkeep
config.json
```

## Scripts

- `npm start` - run FlightScout
- `npm test` - run lightweight Node.js tests
