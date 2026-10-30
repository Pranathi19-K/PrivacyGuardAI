import { GoogleGenAI } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;

export const getGeminiClient = (): GoogleGenAI | null => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  return geminiClient;
};

export const getGeminiStatus = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  const isAvailable = Boolean(apiKey && apiKey.trim() !== '' && apiKey !== 'MY_GEMINI_API_KEY');
  return {
    available: isAvailable,
    model: 'gemini-3.8-flash',
    message: isAvailable 
      ? 'Gemini 3.8 Flash operational via Google GenAI SDK' 
      : 'GEMINI_API_KEY not configured. AI risk assessment and assistant require an API key.',
  };
};
