# FlightScout

FlightScout is a Chrome extension that automatically captures and accumulates flight results from Skyscanner.

It stores flight information locally and allows you to copy or export the results for comparison.

## Features

* Automatically captures Skyscanner flight results
* Keeps results from multiple searches
* Avoids duplicate flights
* Stores data locally with Chrome Storage
* Copies results as a Markdown table
* Exports results to CSV

## Project Structure

```text
flight-scout/
└── extension/
    ├── manifest.json
    ├── popup.html
    ├── popup.js
    ├── content.js
    ├── background.js
    └── styles.css
```

## Installation

### 1. Clone the repository

```bash
git clone <YOUR-REPOSITORY-URL>
cd flight-scout
```

### 2. Open Chrome Extensions

Open:

```text
chrome://extensions
```

Enable **Developer mode**.

### 3. Load FlightScout

Click **Load unpacked** and select:

```text
flight-scout/extension
```

FlightScout should now appear in your installed extensions.

You can pin it to the Chrome toolbar for easier access.

## Testing

### 1. Open Skyscanner

Open Skyscanner using your normal Chrome browser and perform a flight search.

For example:

```text
MLA → CUN
27 Nov 2026
One way
```

Wait until the flight results are displayed.

### 2. Verify FlightScout is running

On the Skyscanner results page:

```text
Right click → Inspect → Console
```

You should see:

```text
FlightScout is running.
```

This confirms that `content.js` was successfully loaded.

### 3. Check captured flights

Click the FlightScout extension icon.

You should see something similar to:

```text
FlightScout

Flights captured       8

[ View results ]
[ Copy table ]
[ Export CSV ]
[ Clear ]
```

### 4. Test multiple searches

Perform another Skyscanner search, for example changing:

```text
27 Nov → 28 Nov
```

Wait for the new results to load and open FlightScout again.

The new flights should be added to the previous results instead of replacing them.

For example:

```text
First search:   8 flights
Second search:  9 flights

Total:         17 flights
```

## Export Results

Use **Copy table** to copy the accumulated results as a Markdown table.

Use **Export CSV** to download the results as:

```text
flights.csv
```

## Clear Results

Click **Clear** to remove all stored flights and start a new comparison.

## Development

After modifying files inside `extension/`:

1. Open `chrome://extensions`
2. Find FlightScout
3. Click the **Reload** button
4. Refresh the Skyscanner page
5. Test again

No `npm start` or build process is required.

## Troubleshooting

If FlightScout shows `0` flights:

* Make sure you are on a Skyscanner results page.
* Wait until the flight results are completely loaded.
* Open the Console and check for `FlightScout is running.`
* Check the Console for JavaScript errors.
* Reload FlightScout from `chrome://extensions`.
* Refresh the Skyscanner page.

If `FlightScout is running.` appears but no flights are captured, Skyscanner may have changed its HTML structure and the selectors in `content.js` may need to be updated.

## License

MIT License
