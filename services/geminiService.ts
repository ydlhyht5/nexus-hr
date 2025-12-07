import { GoogleGenAI } from "@google/genai";

const getApiKey = () => {
  try {
    // Check Vite env
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.API_KEY) {
      // @ts-ignore
      return import.meta.env.API_KEY;
    }
    // Check Node/Process env
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {
    // Ignore errors accessing env
  }
  return '';
};

const apiKey = getApiKey();
// Use fallback ID generation if no key is present, instead of failing
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

/**
 * Generates Pinyin initials from a Chinese name using Gemini.
 * Returns lowercase initials. e.g., "李茹" -> "lr"
 */
export const generatePinyinInitials = async (chineseName: string): Promise<string> => {
  if (!ai) {
    console.warn("No API Key found, using fallback ID generation (random)");
    return chineseName.substring(0, 2).toLowerCase(); // Simple fallback
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Convert the Chinese name "${chineseName}" into its Pinyin initials. 
      Return ONLY the lowercase initials. Do not add spaces or other characters. 
      Example: "李茹" -> "lr".`,
    });

    const text = response.text?.trim().toLowerCase();
    // Basic validation to ensure we got just letters
    return text?.replace(/[^a-z]/g, '') || 'xx';
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback if API fails
    return 'xx';
  }
};
