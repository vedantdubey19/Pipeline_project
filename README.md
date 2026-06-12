# Outreach Pipeline CLI Tool (`outreach-pipeline`)

`outreach-pipeline` is a Node.js command-line tool that automates a complete cold-outreach sequence starting from a single seed domain. The pipeline flows through lookalike company discovery, decision-maker prospecting, email resolution, and safety-checkpoint transactional email delivery.

## Tech Stack
- **Runtime:** Node.js (v18+)
- **Format:** ES Modules (ESM)
- **API Keys Management:** `.env` loaded via `dotenv`
- **Console Highlighting:** Color-coded status alerts via `chalk`

---

## Architecture and Sequence Overview

The tool is structured into 4 sequential stages:

### 1. Stage 1 — Lookalike Discovery (Ocean.io)
Given the seed domain (e.g. `stripe.com`), the tool calls Ocean.io's company search endpoint to fetch up to 10 lookalike domains.

### 2. Stage 2 — Decision-Maker Prospecting (Prospeo)
Takes the lookalike company domains and extracts C-suite and VP-level contacts using Prospeo's domain searching tools. It automatically filters by seniority rules and deduplicates contacts based on their LinkedIn URL.

### 3. Stage 3 — Email Resolution (Eazyreach)
Takes the LinkedIn profile URLs of the prospects and queries Eazyreach's enrichment API to find verified work email addresses. Contacts without resolvable work emails are dropped. It handles rate limits via automatic retries and delays.

### 4. Stage 4 — Safety Checkpoint & Delivery (Brevo)
Renders a visual summary in the console showing the total contacts ready to be messaged, company coverage, and an email preview. Only if the user types `send` does it dispatch cold emails using Brevo (formerly Sendinblue) Transactional SMTP API.

---

## Setup & Prerequisites

### Prerequisites
1. **Node.js**: Version 18 or higher.
2. **Domain-based Email**: Required to register/use certain sales intelligence platforms like Ocean.io.

### Installation
1. Clone the project and navigate to the directory:
   ```bash
   cd outreach-pipeline
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
4. Edit the `.env` file to replace mock values with your active API keys:
   - `OCEAN_API_KEY`
   - `PROSPEO_API_KEY`
   - `EAZYREACH_API_KEY`
   - `BREVO_API_KEY`
   - `SENDER_EMAIL` (the sending address configured on Brevo)
   - `SENDER_NAME` (your display name)

### Run the Pipeline
Execute the tool:
```bash
node index.js
```

### Mock/Demo Mode
If any keys in `.env` are left as `mock_...`, the CLI runs in mock mode, producing fully simulated results across all four stages for local demonstration purposes.
