const { loadConfig } = require('./config');
const { scrapeFlights } = require('./scraper');
const { loadProgress, saveProgress, writeFinalOutputs } = require('./storage');
const { dedupeFlights, sortFlights } = require('./utils');

async function main() {
  const config = await loadConfig();
  const existingProgress = await loadProgress(config.signature);

  if (existingProgress.processedDates.length > 0) {
    console.log(
      `Resuming from saved progress: ${existingProgress.processedDates.length} date(s) already processed.`,
    );
  }

  const result = await scrapeFlights(config, existingProgress, async ({ flights, processedDates }) => {
    const uniqueFlights = sortFlights(dedupeFlights(flights));
    await saveProgress({
      signature: config.signature,
      processedDates,
      flights: uniqueFlights,
    });
  });

  const finalFlights = sortFlights(dedupeFlights(result.flights));
  const outputs = await writeFinalOutputs(finalFlights);

  console.log(`Saved ${outputs.flights.length} unique flights to:`);
  console.log(`- ${outputs.jsonPath}`);
  console.log(`- ${outputs.csvPath}`);
}

main().catch((error) => {
  console.error('FlightScout failed:', error.message);
  process.exitCode = 1;
});
