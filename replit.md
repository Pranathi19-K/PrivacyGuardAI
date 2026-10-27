# PrivacyGuard AI

PrivacyGuard AI helps people find, review, and mask sensitive information in PDF and TXT documents.

## Run & Operate

- Start the configured `artifacts/api-server: API Server` workflow for the backend.
- Start the configured `artifacts/privacyguard-ai: web` workflow for the frontend.
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/api-server run test` — run privacy detection and document-processing tests
- Required secrets: `MONGODB_URI`, `SESSION_SECRET`, and `GEMINI_API_KEY` unless a managed Gemini integration is provisioned.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React, Vite, Tailwind CSS, Wouter, TanStack Query
- API: Express 5, OpenAPI + Orval-generated Zod schemas and React Query hooks
- Persistence: MongoDB Atlas with Mongoose
- Auth: bcrypt password hashes and JWTs in HTTP-only cookies
- Document processing: in-memory Multer uploads and PDF.js text extraction
- Assistant: Gemini through the managed Replit integration when configured, otherwise direct Google Gemini API
- Build: Vite frontend and esbuild API bundle

## Where things live

- `artifacts/privacyguard-ai/src/` — web app pages, router, and theme.
- `artifacts/api-server/src/routes/` — auth, scans, rules, dashboard, and audit endpoints.
- `artifacts/api-server/src/lib/` — Mongo models, document extraction, detection, masking, assistant prompt, and temporary review drafts.
- `lib/api-spec/openapi.yaml` — source of truth for API contracts; run codegen after changing it.
- `README.md` and `.env.example` — setup, privacy behavior, checks, and deployment guidance.

## Architecture decisions

- Uploaded originals and extracted original text live only in process memory for at most 30 minutes; a restart discards pending review drafts.
- MongoDB stores scan metadata and finalized masked text, not original files or original document text.
- The assistant receives a sanitized user question and scan metadata only, never document text.
- Downloadable analysis reports include scan metadata and finding counts, never document text.
- Custom patterns use a restricted regex subset to reduce ReDoS risk.

## Product

Users can register and sign in, upload PDF/TXT documents, review supported sensitive-data matches, select redactions, download masked output and analysis reports, delete individual scans, view scan history and audit events, manage custom detection rules, and ask Gemini about scan metadata.

## User preferences

The product brief requires royal-blue privacy and cybersecurity styling and clearly states that detection and risk scores are not guarantees of privacy or legal compliance.

## Gotchas

- Scanned-image PDFs are not OCR'd; the current PDF flow extracts embedded text only.
- Pending review drafts are process-local and expire after 30 minutes.
- Every OpenAPI edit requires codegen before using changed API types.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
