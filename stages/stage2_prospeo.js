import { logger } from '../utils/logger.js';
import { delay } from '../utils/delay.js';

/**
 * Stage 2: Decision-Maker Prospecting (Prospeo)
 * For each domain, surfaces C-suite and VP-level contacts with LinkedIn URLs.
 * 
 * @param {string[]} domains 
 * @returns {Promise<Array<{fullName: string, linkedinUrl: string, companyDomain: string}>>}
 */
export async function findDecisionMakers(domains) {
  const apiKey = process.env.PROSPEO_API_KEY;
  const isMock = !apiKey || apiKey === 'mock_prospeo_key';

  if (isMock) {
    logger.skip(2, 'Using mock/demo mode for Decision-Maker Prospecting (Prospeo)');
    const mockContacts = [];
    const mockNames = [
      { first: 'Sarah', last: 'Chen', title: 'CEO' },
      { first: 'Marcus', last: 'Aurelius', title: 'VP of Engineering' },
      { first: 'David', last: 'Backham', title: 'VP of Sales' },
      { first: 'Elena', last: 'Rostova', title: 'Chief Operating Officer' }
    ];

    // Generate 1-2 decision makers per mock domain
    domains.forEach((domain, idx) => {
      const nameSet1 = mockNames[idx % mockNames.length];
      const nameSet2 = mockNames[(idx + 1) % mockNames.length];

      mockContacts.push({
        fullName: `${nameSet1.first} ${nameSet1.last}`,
        linkedinUrl: `https://www.linkedin.com/in/${nameSet1.first.toLowerCase()}-${nameSet1.last.toLowerCase()}-${domain.split('.')[0]}`,
        companyDomain: domain
      });

      // Add a second contact for odd indices
      if (idx % 2 === 1) {
        mockContacts.push({
          fullName: `${nameSet2.first} ${nameSet2.last}`,
          linkedinUrl: `https://www.linkedin.com/in/${nameSet2.first.toLowerCase()}-${nameSet2.last.toLowerCase()}-${domain.split('.')[0]}`,
          companyDomain: domain
        });
      }
    });

    logger.success(2, `Found ${mockContacts.length} decision-makers across ${domains.length} companies`);
    return mockContacts;
  }

  logger.stage(2, `Starting prospecting for ${domains.length} domains...`);
  const results = [];
  const seenLinkedinUrls = new Set();
  let successCount = 0;
  let failCount = 0;

  for (const domain of domains) {
    logger.stage(2, `Prospecting domain: ${domain}...`);
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await fetch('https://api.prospeo.io/v1/domain-search', {
          method: 'POST',
          headers: {
            'X-KEY': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            company_domain: domain,
            page: page
          })
        });

        if (response.status === 429) {
          logger.skip(2, '429 Rate limit hit, retrying in 2 seconds...');
          await delay(2000);
          // Retry once
          const retryRes = await fetch('https://api.prospeo.io/v1/domain-search', {
            method: 'POST',
            headers: {
              'X-KEY': apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              company_domain: domain,
              page: page
            })
          });
          if (!retryRes.ok) {
            logger.skip(2, `Retry failed for ${domain} with status ${retryRes.status}. Skipping.`);
            failCount++;
            break;
          }
        } else if (!response.ok) {
          logger.skip(2, `Error fetching ${domain} (HTTP ${response.status}). Skipping.`);
          failCount++;
          break;
        }

        const data = await response.json();
        
        // Parse contacts
        const responseData = data.response || data;
        const contactsList = responseData.results || responseData.contacts || [];

        if (contactsList.length === 0) {
          hasMore = false;
          break;
        }

        for (const contact of contactsList) {
          const seniority = (contact.seniority || '').toUpperCase();
          const title = (contact.title || '').toUpperCase();

          // Check for C-suite and VP level keywords
          const isCSuite = seniority === 'C_SUITE' || seniority === 'C-SUITE' || title.includes('CEO') || title.includes('CTO') || title.includes('CFO') || title.includes('COO') || title.includes('CHIEF');
          const isVP = seniority === 'VP' || title.includes('VICE PRESIDENT') || title.startsWith('VP');

          if (isCSuite || isVP) {
            const firstName = contact.first_name || '';
            const lastName = contact.last_name || '';
            const fullName = contact.full_name || `${firstName} ${lastName}`.trim() || 'Decision Maker';
            const linkedinUrl = contact.linkedin || contact.linkedin_url;

            if (linkedinUrl && !seenLinkedinUrls.has(linkedinUrl)) {
              seenLinkedinUrls.add(linkedinUrl);
              results.push({
                fullName,
                linkedinUrl,
                companyDomain: domain
              });
            }
          }
        }

        // Handle pagination
        const pagination = responseData.pagination;
        if (pagination && pagination.total_pages && page < pagination.total_pages) {
          page++;
        } else {
          hasMore = false;
        }

        successCount++;
      } catch (err) {
        logger.skip(2, `Error searching domain ${domain}: ${err.message}`);
        failCount++;
        hasMore = false;
      }
    }
  }

  logger.success(2, `Found ${results.length} decision-makers across ${domains.length} companies (Succeeded: ${successCount}, Failed/Skipped: ${failCount})`);
  return results;
}
