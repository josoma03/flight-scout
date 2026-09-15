const fs = require('node:fs/promises');
const path = require('node:path');
const { createConfigSignature, generateDateRange } = require('./utils');

const DEFAULT_CONFIG_PATH = path.resolve(process.cwd(), 'config.json');

async function loadConfig(configPath = DEFAULT_CONFIG_PATH) {
  const rawConfig = await fs.readFile(configPath, 'utf8');
  const parsedConfig = JSON.parse(rawConfig);

  const requiredFields = ['origin', 'destination', 'startDate', 'endDate', 'adults', 'currency'];
  for (const field of requiredFields) {
    if (parsedConfig[field] === undefined || parsedConfig[field] === null || parsedConfig[field] === '') {
      throw new Error(`Missing required config field: ${field}`);
    }
  }

  const config = {
    ...parsedConfig,
    origin: String(parsedConfig.origin).trim().toUpperCase(),
    destination: String(parsedConfig.destination).trim().toUpperCase(),
    adults: Number(parsedConfig.adults),
    currency: String(parsedConfig.currency).trim().toUpperCase(),
    searchDelayMs: Number(parsedConfig.searchDelayMs ?? 5000),
    headless: Boolean(parsedConfig.headless ?? false),
    locale: String(parsedConfig.locale ?? 'en-US').trim(),
    market: String(parsedConfig.market ?? 'US').trim().toUpperCase(),
  };

  if (!/^[A-Z]{3}$/.test(config.origin)) {
    throw new Error(`Invalid origin airport IATA code: ${config.origin}`);
  }

  if (!/^[A-Z]{3}$/.test(config.destination)) {
    throw new Error(`Invalid destination airport IATA code: ${config.destination}`);
  }

  if (!Number.isInteger(config.adults) || config.adults < 1) {
    throw new Error('adults must be a positive integer.');
  }

  if (!/^[A-Z]{3}$/.test(config.currency)) {
    throw new Error(`Invalid currency code: ${config.currency}`);
  }

  if (!Number.isFinite(config.searchDelayMs) || config.searchDelayMs < 0) {
    throw new Error('searchDelayMs must be a non-negative number.');
  }

  config.dates = generateDateRange(config.startDate, config.endDate);
  config.signature = createConfigSignature(config);

  return config;
}

module.exports = {
  DEFAULT_CONFIG_PATH,
  loadConfig,
};
