import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates Pinyin initials from a Chinese name using Gemini.
 * Returns lowercase initials. e.g., "李茹" -> "lr"
 */
export const generatePinyinInitials = async (chineseName: string): Promise<string> => {
  if (!chineseName) return '';
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Convert the Chinese name "${chineseName}" into its Pinyin initials. 
      Return ONLY the lowercase initials. Do not add spaces, numbers or symbols. 
      Strictly just the first letter of each Pinyin syllable.
      Example: "李茹" -> "lr". "张三丰" -> "zsf".`,
    });

    const text = response.text?.trim().toLowerCase();
    // Strict validation: keep only a-z
    const cleanText = text?.replace(/[^a-z]/g, '');
    return cleanText || chineseName.substring(0, 2).toLowerCase();
  } catch (error) {
    console.warn("Gemini API Error (Pinyin):", error);
    // Fallback: simple slice (not pinyin, but prevents crash)
    return chineseName.substring(0, 2).toLowerCase();
  }
};
