import { logger } from '../utils/logger.js';
import { delay } from '../utils/delay.js';

/**
 * Stage 3: Email Resolution (Eazyreach)
 * Resolves each LinkedIn URL to a verified business email.
 * Drops contacts where no email could be resolved.
 * 
 * @param {Array<{fullName: string, linkedinUrl: string, companyDomain: string}>} contacts 
 * @returns {Promise<Array<{fullName: string, linkedinUrl: string, companyDomain: string, email: string}>>}
 */
export async function resolveEmails(contacts) {
  const apiKey = process.env.EAZYREACH_API_KEY;
  const isMock = !apiKey || apiKey === 'mock_eazyreach_key';

  if (isMock) {
    logger.skip(3, 'Using mock/demo mode for Email Resolution (Eazyreach)');
    const enriched = [];
    let droppedCount = 0;

    for (const contact of contacts) {
      await delay(100); // Small delay to simulate async network operations

      // Resolve about 85% of emails, drop 15% for realism
      if (Math.random() > 0.15) {
        const nameParts = contact.fullName.toLowerCase().split(' ');
        const first = nameParts[0] || 'info';
        const last = nameParts[1] || '';
        const emailPrefix = last ? `${first}.${last}` : first;
        const email = `${emailPrefix}@${contact.companyDomain}`;

        enriched.push({
          ...contact,
          email
        });
      } else {
        droppedCount++;
      }
    }

    logger.success(3, `Resolved ${enriched.length} emails, dropped ${droppedCount} contacts`);
    return enriched;
  }

  logger.stage(3, `Resolving emails for ${contacts.length} decision-makers...`);
  const enriched = [];
  let droppedCount = 0;
  let successCount = 0;
  let failCount = 0;

  for (const contact of contacts) {
    logger.stage(3, `Resolving email for ${contact.fullName} (${contact.companyDomain})...`);
    
    // Add 500ms delay between requests to respect rate limits
    await delay(500);

    let emailResolved = null;
    let attempt = 0;
    const maxAttempts = 2;

    while (attempt < maxAttempts) {
      try {
        attempt++;
        const response = await fetch('https://api.eazyreach.app/v1/enrich', {
          method: 'POST',
          headers: {
            'X-API-KEY': apiKey,
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            api_key: apiKey,
            linkedin_url: contact.linkedinUrl,
            linkedinUrl: contact.linkedinUrl
          })
        });

        if (response.status === 429) {
          logger.skip(3, `429 Rate limit hit, retrying attempt ${attempt} in 2 seconds...`);
          await delay(2000);
          continue; // retry
        }

        if (!response.ok) {
          logger.skip(3, `Failed to resolve email for ${contact.fullName} (HTTP ${response.status})`);
          break;
        }

        const data = await response.json();
        
        // Try multiple standard response formats
        const responseData = data.response || data.data || data;
        emailResolved = responseData.email || responseData.verified_email || (responseData.person && responseData.person.email);
        break; // break retry loop on success
      } catch (err) {
        logger.skip(3, `Error resolving email for ${contact.fullName}: ${err.message}`);
        if (attempt >= maxAttempts) {
          break;
        }
        await delay(1000);
      }
    }

    if (emailResolved) {
      enriched.push({
        ...contact,
        email: emailResolved
      });
      successCount++;
    } else {
      droppedCount++;
      failCount++;
    }
  }

  logger.success(3, `Resolved ${enriched.length} emails, dropped ${droppedCount} contacts (Succeeded: ${successCount}, Failed/Skipped: ${failCount})`);
  return enriched;
}
