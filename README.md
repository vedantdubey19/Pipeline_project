# Outreach Pipeline CLI Tool (`outreach-pipeline`)

`outreach-pipeline` is a single command-line Node.js program that automates a complete cold-outreach sequence starting from a single seed domain. Sourcing, prospecting, resolving, and delivery are chained together with zero manual steps in between.

---

## Tech Stack & Project Architecture

- **Runtime**: Node.js (v18+)
- **Format**: ES Modules (ESM)
- **Dependencies**: `dotenv` (API Key configuration) & `chalk` (clean, color-coded logging)
- **Directory Structure**:
  ```text
  outreach-pipeline/
  ├── index.js              # Orchestrator & CLI Entrypoint
  ├── stages/
  │   ├── stage1_ocean.js    # Lookalike Discovery (Ocean.io)
  │   ├── stage2_prospeo.js   # Decision-Maker Prospecting (Prospeo)
  │   ├── stage3_eazyreach.js # Email Resolution (Eazyreach)
  │   └── stage4_brevo.js     # Safety Checkpoint & Delivery (Brevo)
  ├── utils/
  │   ├── logger.js          # Custom colorized logging output
  │   └── delay.js           # Async promise delays for rate limits
  ├── template.txt           # Customizable email copy
  ├── .env                   # Local configuration keys (ignored by git)
  ├── .env.example           # Placeholder file for keys
  └── package.json           # Node configuration & dependencies
  ```

---

## The Four Pipeline Stages

### 1. Lookalike Discovery (Ocean.io)
Takes the user's seed domain and queries Ocean.io's company search to find up to 10 lookalike domains. This expands a single successful customer profile into a highly targeted list of matching companies sharing similar firmographics, size, and market.

### 2. Decision-Maker Prospecting (Prospeo)
Takes the list of company domains and queries Prospeo to surface C-suite and VP-level contacts alongside their LinkedIn profile URLs. It handles pagination automatically and deduplicates contacts based on their LinkedIn URL to ensure no contact receives multiple duplicate sequences.

### 3. Email Resolution (Eazyreach)
Queries the Eazyreach API to resolve the LinkedIn URLs of the selected decision-makers to verified business emails. Contacts without resolvable work emails are automatically dropped. It respects API limits by executing a 500ms delay between fetches.

### 4. Safety Checkpoint & Delivery (Brevo)
Calculates and displays a terminal summary card showing the number of contacts ready to be messaged, companies covered, and a preview of the email. After the user types `send` (case-insensitive), it uses Brevo's Transactional SMTP API to send out personalized cold outreach emails.

---

## Evaluation Criteria & Resiliency Features

- **Runs End-to-End**: A single command runs the entire sequence from seed domain input to final delivery confirmation.
- **Integrations Done Right**: Auth headers, payload formatting, pagination, and error codes are mapped according to real API requirements.
- **Resilient to Messy Data**: Loops are wrapped in granular try/catch blocks. If a lookalike lookup, contact query, or email send fails, the tool skips the item, logs a descriptive warning, and continues without crashing the pipeline.
- **Rate-Limit Resilience**: Handles HTTP 429 status codes by waiting 2 seconds and retrying the request once before skipping.
- **Good Judgment Checkpoint**: Displays an elegant summary panel showing total contacts and company counts, alongside a sample email, and halts delivery until the user types `send`.
- **Smart State Caching**: Execution states are saved to `.pipeline_cache.json` at each stage. If a run is interrupted or aborted before delivery, restarting the tool will offer to resume from the last completed stage to prevent wasting API credits.

---

## Setup & Prerequisites

### Setup Order (As per take-home instructions)
1. **Get a domain first**: Acquire a free domain (e.g., via the GitHub Student Developer Pack).
2. **Set up company email**: You must have a domain-based company email (e.g., `you@yourdomain.com`).
3. **Sign up for Ocean.io**: Sign up using your new company email (Ocean.io requires domain-based business emails).
4. **Create other accounts**: Sign up for Prospeo, Eazyreach, and Brevo.

### Key Configurations
Copy `.env.example` to `.env` and fill in the following:
```ini
OCEAN_API_KEY=your_ocean_key
PROSPEO_API_KEY=your_prospeo_key
EAZYREACH_API_KEY=your_eazyreach_key
BREVO_API_KEY=your_brevo_key
SENDER_EMAIL=your@configured_sender_domain.com
SENDER_NAME=Your Name
```

---

## How to Run

1. Install dependencies:
   ```bash
   npm install
   ```
2. Launch the orchestrator:
   ```bash
  
   ```

*(Note: Leaving the keys starting with `mock_` in your `.env` file automatically activates mock mode, which generates simulated test data across all stages for demonstration purposes).*
