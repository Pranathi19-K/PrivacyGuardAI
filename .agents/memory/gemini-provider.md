---
name: Gemini provider setup
description: Provider choice and billing for PrivacyGuard AI.
---

PrivacyGuard uses a direct Google Gemini API key from Replit Secrets when the managed Replit Gemini endpoint is unavailable. Direct API usage is billed by Google.

**Why:** This workspace had no Gemini integration connection or managed endpoint variables, so the user provided a `GEMINI_API_KEY` secret to keep the requested assistant functional.

**How to apply:** Keep the key in Replit Secrets and use the Google SDK default endpoint unless both managed integration variables are present. Never log or expose the key.
