import { GoogleGenAI, Modality } from "@google/genai";

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

export async function generateImage(
  prompt: string
): Promise<{ b64_json: string; mimeType: string }> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
    },
  });

  const candidate = response.candidates?.[0];
  const imagePart = candidate?.content?.parts?.find(
    (part: { inlineData?: { data?: string; mimeType?: string } }) => part.inlineData
  );

  if (!imagePart?.inlineData?.data) {
    throw new Error("No image data in response");
  }

  return {
    b64_json: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || "image/png",
  };
}
