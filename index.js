import readline from 'readline';
import dotenv from 'dotenv';
import { logger } from './utils/logger.js';
import { findLookalikes } from './stages/stage1_ocean.js';
import { findDecisionMakers } from './stages/stage2_prospeo.js';
import { resolveEmails } from './stages/stage3_eazyreach.js';
import { sendOutreach } from './stages/stage4_brevo.js';

// Load environment variables
dotenv.config();

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

  // Check if any key is using mock/placeholder value
  const usingMocks = keys.some(k => process.env[k].startsWith('mock_'));
  if (usingMocks) {
    logger.skip(0, '⚠️  Notice: Running in MOCK/DEMO mode because placeholder API keys were detected in .env');
  }
}

/**
 * Prompt the user for seed domain input.
 */
function promptSeedDomain() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Enter seed domain (e.g. stripe.com): ', (answer) => {
      rl.close();
      const domain = answer.trim().toLowerCase();
      if (!domain) {
        logger.error('Seed domain cannot be empty.');
        process.exit(1);
      }
      resolve(domain);
    });
  });
}

/**
 * Main execution flow
 */
async function main() {
  checkEnv();
  
  const seedDomain = await promptSeedDomain();
  
  logger.stage(1, `Initializing outreach sequence for seed domain: ${seedDomain}`);
  
  // Stage 1: Lookalike Discovery
  const domains = await findLookalikes(seedDomain);
  
  // Stage 2: Decision-Maker Prospecting
  const contacts = await findDecisionMakers(domains);
  
  // Stage 3: Email Resolution
  const enriched = await resolveEmails(contacts);
  
  // Stage 4: Safety Checkpoint & Delivery
  await sendOutreach(enriched);
}

main().catch(err => {
  logger.error(`Pipeline crashed: ${err.message}`);
  process.exit(1);
});
