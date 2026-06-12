import readline from 'readline';
import { logger } from '../utils/logger.js';
import { delay } from '../utils/delay.js';

/**
 * Helper to capitalize the company name from domain.
 * e.g., stripe.com -> Stripe
 */
function getCompanyName(domain) {
  if (!domain) return 'your company';
  const name = domain.split('.')[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Helper to construct the email subject and body.
 */
function generateEmail(contact) {
  const firstName = contact.fullName.split(' ')[0] || 'there';
  const companyName = getCompanyName(contact.companyDomain);
  const companyDomain = contact.companyDomain;
  const senderName = process.env.SENDER_NAME || 'Alex';

  const subject = `Quick idea for ${companyName}`;
  const body = `Hi ${firstName},

I came across ${companyDomain} while researching companies in your space — really impressed by what you're building.

I wanted to reach out directly because I think there's a strong fit with what we do. We help fast-growing teams automate outbound workflows to multiply their sales pipelines.

Would you be open to a 15-minute call this week?

Best,
${senderName}`;

  return { subject, body };
}

/**
 * Stage 4: Safety Checkpoint + Email Delivery (Brevo)
 * Displays outreach summary and sends personalized cold emails upon user confirmation.
 * 
 * @param {Array<{fullName: string, linkedinUrl: string, companyDomain: string, email: string}>} enrichedContacts 
 * @returns {Promise<void>}
 */
export async function sendOutreach(enrichedContacts) {
  if (enrichedContacts.length === 0) {
    logger.skip(4, 'No contacts available to send outreach emails.');
    logger.done('Pipeline complete. 0 emails sent, 0 failed.');
    return;
  }

  const uniqueCompanies = new Set(enrichedContacts.map(c => c.companyDomain)).size;
  const sampleContact = enrichedContacts[0];
  const { subject: sampleSubject, body: sampleBody } = generateEmail(sampleContact);
  
  // Get first 3 lines of body
  const sampleLines = sampleBody.split('\n').slice(0, 3).join('\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  OUTREACH SUMMARY — READY TO SEND');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Contacts ready:    ${enrichedContacts.length}`);
  console.log(`  Companies covered: ${uniqueCompanies}`);
  console.log('');
  console.log('  SAMPLE EMAIL');
  console.log(`  To:      ${sampleContact.fullName} <${sampleContact.email}>`);
  console.log(`  Subject: ${sampleSubject}`);
  console.log('');
  console.log(sampleLines);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const confirmSend = () => {
    return new Promise((resolve) => {
      rl.question('  Type "send" to fire all emails, or Ctrl+C to abort: ', (answer) => {
        rl.close();
        resolve(answer.trim().toLowerCase() === 'send');
      });
    });
  };

  const confirmed = await confirmSend();

  if (!confirmed) {
    logger.skip(4, 'Outreach cancelled by the user.');
    logger.done('Pipeline complete. 0 emails sent, 0 failed.');
    return;
  }

  logger.stage(4, `Initiating email delivery to ${enrichedContacts.length} prospects...`);

  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL || 'sender@domain.com';
  const senderName = process.env.SENDER_NAME || 'Sender Name';
  const isMock = !apiKey || apiKey === 'mock_brevo_key';

  let sentCount = 0;
  let failCount = 0;

  for (const contact of enrichedContacts) {
    const { subject, body } = generateEmail(contact);

    if (isMock) {
      // Small simulated delay for delivery realism
      await delay(200);
      logger.success(4, `Sent to ${contact.email}`);
      sentCount++;
      continue;
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: {
            name: senderName,
            email: senderEmail
          },
          to: [
            {
              email: contact.email,
              name: contact.fullName
            }
          ],
          subject: subject,
          textContent: body,
          htmlContent: body.replace(/\n/g, '<br>')
        })
      });

      if (response.status === 429) {
        logger.skip(4, `429 Rate limit hit while sending to ${contact.email}. Retrying in 2 seconds...`);
        await delay(2000);
        const retryRes = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sender: {
              name: senderName,
              email: senderEmail
            },
            to: [
              {
                email: contact.email,
                name: contact.fullName
              }
            ],
            subject: subject,
            textContent: body,
            htmlContent: body.replace(/\n/g, '<br>')
          })
        });
        if (retryRes.ok) {
          logger.success(4, `Sent to ${contact.email}`);
          sentCount++;
        } else {
          logger.error(`Failed to send to ${contact.email} (HTTP ${retryRes.status})`);
          failCount++;
        }
      } else if (!response.ok) {
        const errDetails = await response.text();
        logger.error(`Failed to send to ${contact.email} (HTTP ${response.status}): ${errDetails}`);
        failCount++;
      } else {
        logger.success(4, `Sent to ${contact.email}`);
        sentCount++;
      }
    } catch (err) {
      logger.error(`Network error sending to ${contact.email}: ${err.message}`);
      failCount++;
    }
  }

  logger.done(`Pipeline complete. ${sentCount} emails sent, ${failCount} failed.`);
}
