import { GoogleGenAI } from "@google/genai";

const managedBaseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
const managedApiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
const directApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI;

if (managedBaseUrl && managedApiKey) {
  ai = new GoogleGenAI({
    apiKey: managedApiKey,
    httpOptions: {
      apiVersion: "",
      baseUrl: managedBaseUrl,
    },
  });
} else if (directApiKey) {
  ai = new GoogleGenAI({ apiKey: directApiKey });
} else {
  throw new Error(
    "Configure the Gemini integration or set GEMINI_API_KEY in Replit Secrets.",
  );
}

export { ai };
