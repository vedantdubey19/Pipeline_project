import { logger } from '../utils/logger.js';

/**
 * Stage 1: Lookalike Discovery (Ocean.io)
 * Given the seed domain, returns up to 10 similar company domains.
 * 
 * @param {string} seedDomain 
 * @returns {Promise<string[]>}
 */
export async function findLookalikes(seedDomain) {
  const apiKey = process.env.OCEAN_API_KEY;

  if (!apiKey || apiKey === 'mock_ocean_key') {
    logger.skip(1, 'Using mock/demo mode for Lookalike Discovery (Ocean.io)');
    // Realistic mock domains based on Stripe lookalikes
    const mockData = [
      'adyen.com',
      'paypal.com',
      'braintreepayments.com',
      'checkout.com',
      'klarna.com',
      'paddle.com',
      'squareups.com',
      'wise.com',
      'revolut.com',
      'plaid.com'
    ];
    logger.success(1, `Found ${mockData.length} lookalike companies`);
    return mockData;
  }

  logger.stage(1, `Finding lookalike companies for seed domain: ${seedDomain}...`);

  try {
    const response = await fetch('https://api.ocean.io/v3/search/companies', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        size: 10,
        lookalike: {
          domains: [seedDomain]
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const resBody = await response.json();
    const companies = resBody.companies || resBody.data || resBody.results || [];
    
    const domains = companies
      .map(c => c.domain || c.company_domain || c.website || c.domain_name)
      .filter(Boolean)
      .slice(0, 10);

    if (domains.length === 0) {
      logger.error('No lookalike companies found or empty results returned from Ocean.io.');
      process.exit(0);
    }

    logger.success(1, `Found ${domains.length} lookalike companies`);
    return domains;
  } catch (error) {
    logger.error(`Ocean.io API failed: ${error.message}`);
    logger.info('Exiting pipeline gracefully.');
    process.exit(0);
  }
}
