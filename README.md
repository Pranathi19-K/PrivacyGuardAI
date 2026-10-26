# PrivacyGuard AI

PrivacyGuard AI scans PDF and TXT documents for common sensitive-data patterns, lets the user review and select matches, and provides a masked plain-text copy plus a downloadable privacy analysis report. It includes account login, scan history, custom detection rules, an audit log, and a Gemini assistant that only receives a sanitized question and scan metadata.

## Privacy behavior

- Uploaded file bytes and extracted original text are held in API-process memory only, for up to 30 minutes while the review is pending. Restarting the API discards those drafts sooner.
- Original documents and original text are not written to MongoDB.
- Finalized scan metadata and the resulting masked text are stored in MongoDB until the user deletes the scan or account. Text without findings is not saved as a masked document.
- Downloadable analysis reports contain scan metadata and findings counts, not document text.
- The Gemini assistant does not receive document text. It receives the scan's risk/count summary and a question with supported sensitive patterns masked.
- Users choose which findings to mask. Unselected matches remain in the output by choice; detection can miss sensitive content.
- Scans and risk scores are not guarantees of privacy or legal compliance.
- PDF text extraction is supported; scanned-image PDFs and OCR are not supported.

## Setup

The project uses the Replit pnpm workspace. Add these secrets in the Replit project before starting the API:

- `MONGODB_URI` — MongoDB Atlas connection URI for the application database.
- `SESSION_SECRET` — long random signing secret for JWT session cookies.

Gemini is accessed through Replit AI Integrations; no user-managed Gemini API key is needed. Gemini usage is billed to Replit credits. The required Gemini integration environment is already configured for this project.

`.env.example` contains placeholders only. Do not commit real credentials.

Install packages with `pnpm install`. Start the configured `API Server` and `PrivacyGuard AI` workflows from Replit. The frontend is served at `/` and calls the shared API under `/api`.

## Checks

```sh
pnpm run typecheck
pnpm --filter @workspace/api-server run test
```

The API tests cover PDF/TXT input validation, PII pattern detection, optional name detection, safe custom patterns, redaction behavior, risk scoring, and privacy boundaries for the assistant and downloadable reports. Connecting to MongoDB Atlas and using Gemini require the configured Replit environment.

## Deployment

Publish the app through Replit when it is ready. Confirm that `MONGODB_URI`, `SESSION_SECRET`, and the managed Gemini integration are available in the deployment environment. A public URL is available only after a successful publish.
