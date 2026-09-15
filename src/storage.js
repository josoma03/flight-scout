const fs = require('node:fs/promises');
const path = require('node:path');
const { dedupeFlights, sortFlights, toCsv } = require('./utils');

const OUTPUT_DIR = path.resolve(process.cwd(), 'output');
const PROGRESS_PATH = path.join(OUTPUT_DIR, 'progress.json');
const JSON_OUTPUT_PATH = path.join(OUTPUT_DIR, 'flights.json');
const CSV_OUTPUT_PATH = path.join(OUTPUT_DIR, 'flights.csv');

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function loadProgress(signature) {
  await ensureOutputDir();

  try {
    const raw = await fs.readFile(PROGRESS_PATH, 'utf8');
    const progress = JSON.parse(raw);

    if (signature && progress.signature && progress.signature !== signature) {
      return createEmptyProgress(signature);
    }

    return {
      signature: signature || progress.signature || null,
      processedDates: Array.isArray(progress.processedDates) ? progress.processedDates : [],
      flights: Array.isArray(progress.flights) ? dedupeFlights(progress.flights) : [],
      updatedAt: progress.updatedAt || null,
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return createEmptyProgress(signature);
    }

    throw error;
  }
}

function createEmptyProgress(signature) {
  return {
    signature: signature || null,
    processedDates: [],
    flights: [],
    updatedAt: null,
  };
}

async function saveProgress({ signature, processedDates, flights }) {
  await ensureOutputDir();
  const payload = {
    signature,
    processedDates: [...new Set(processedDates)].sort(),
    flights: sortFlights(dedupeFlights(flights)),
    updatedAt: new Date().toISOString(),
  };
  const tempPath = `${PROGRESS_PATH}.tmp`;

  await fs.writeFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await fs.rename(tempPath, PROGRESS_PATH);
  return payload;
}

async function writeFinalOutputs(flights) {
  await ensureOutputDir();
  const sortedFlights = sortFlights(dedupeFlights(flights));

  await fs.writeFile(JSON_OUTPUT_PATH, `${JSON.stringify(sortedFlights, null, 2)}\n`, 'utf8');
  await fs.writeFile(CSV_OUTPUT_PATH, `${toCsv(sortedFlights)}\n`, 'utf8');

  return {
    jsonPath: JSON_OUTPUT_PATH,
    csvPath: CSV_OUTPUT_PATH,
    flights: sortedFlights,
  };
}

module.exports = {
  CSV_OUTPUT_PATH,
  JSON_OUTPUT_PATH,
  OUTPUT_DIR,
  PROGRESS_PATH,
  createEmptyProgress,
  ensureOutputDir,
  loadProgress,
  saveProgress,
  writeFinalOutputs,
};
