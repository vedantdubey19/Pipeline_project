import readline from 'readline';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { logger } from './utils/logger.js';
import { findLookalikes } from './stages/stage1_ocean.js';
import { findDecisionMakers } from './stages/stage2_prospeo.js';
import { resolveEmails } from './stages/stage3_eazyreach.js';
import { sendOutreach } from './stages/stage4_brevo.js';

// Load environment variables
dotenv.config();

const CACHE_FILE = '.pipeline_cache.json';

/**
 * Validate configuration and check if running in Mock mode.
 */
function checkEnv() {
  const keys = ['OCEAN_API_KEY', 'PROSPEO_API_KEY', 'EAZYREACH_API_KEY', 'BREVO_API_KEY'];
  const missing = keys.filter(k => !process.env[k]);
  
  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    logger.info('Please configure your .env file using .env.example.');
    process.exit(1);
  }

  const usingMocks = keys.some(k => process.env[k].startsWith('mock_'));
  if (usingMocks) {
    logger.skip(0, '⚠️  Notice: Running in MOCK/DEMO mode because placeholder API keys were detected in .env');
  }
}

/**
 * Prompts user for a yes/no response.
 */
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

/**
 * Validates domain using regex.
 */
function isValidDomain(domain) {
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
  return domainRegex.test(domain);
}

/**
 * Cache operations
 */
function saveCache(seedDomain, stageNum, data) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ seedDomain, stageNum, data }, null, 2));
  } catch (err) {
    logger.skip(0, `Failed to save cache: ${err.message}`);
  }
}

function clearCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
    }
  } catch (err) {
    logger.skip(0, `Failed to clear cache: ${err.message}`);
  }
}

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    logger.skip(0, `Failed to read cache file: ${err.message}`);
  }
  return null;
}

/**
 * Main execution flow
 */
async function main() {
  checkEnv();

  let seedDomain = '';
  let startStage = 1;
  let domains = [];
  let contacts = [];
  let enriched = [];

  const cache = loadCache();

  if (cache) {
    const resumeAns = await askQuestion(`Found a cached pipeline run for seed domain "${cache.seedDomain}" at Stage ${cache.stageNum}. Resume? (y/n): `);
    if (resumeAns === 'y' || resumeAns === 'yes') {
      seedDomain = cache.seedDomain;
      startStage = cache.stageNum + 1;
      
      logger.success(0, `Resuming pipeline for domain "${seedDomain}" starting at Stage ${startStage}`);

      // Restore data state based on resume stage
      if (startStage === 2) {
        domains = cache.data;
      } else if (startStage === 3) {
        contacts = cache.data;
      } else if (startStage === 4) {
        enriched = cache.data;
      }
    } else {
      logger.skip(0, 'Clearing cache and starting a fresh run.');
      clearCache();
    }
  }

  // If starting fresh, prompt for seed domain
  if (startStage === 1) {
    const promptAns = await askQuestion('Enter seed domain (e.g. stripe.com): ');
    seedDomain = promptAns.trim().toLowerCase();
    
    if (!seedDomain) {
      logger.error('Seed domain cannot be empty.');
      process.exit(1);
    }

    if (!isValidDomain(seedDomain)) {
      logger.error(`Invalid domain format: "${seedDomain}". Please enter a valid domain (e.g. stripe.com).`);
      process.exit(1);
    }

    logger.stage(1, `Initializing outreach sequence for seed domain: ${seedDomain}`);
  }

  // Stage 1: Lookalike Discovery
  if (startStage <= 1) {
    domains = await findLookalikes(seedDomain);
    saveCache(seedDomain, 1, domains);
  }

  // Stage 2: Decision-Maker Prospecting
  if (startStage <= 2) {
    contacts = await findDecisionMakers(domains);
    saveCache(seedDomain, 2, contacts);
  }

  // Stage 3: Email Resolution
  if (startStage <= 3) {
    enriched = await resolveEmails(contacts);
    saveCache(seedDomain, 3, enriched);
  }

  // Stage 4: Safety Checkpoint & Delivery
  await sendOutreach(enriched);

  // Successfully completed all stages, clear cache
  clearCache();
}

main().catch(err => {
  logger.error(`Pipeline crashed: ${err.message}`);
  process.exit(1);
});
