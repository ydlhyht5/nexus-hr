import { pinyin } from 'pinyin-pro';

/**
 * Generates Pinyin initials from a Chinese name using pinyin-pro.
 * Returns lowercase initials. e.g., "李茹" -> "lr", "测试" -> "cs"
 * Handles English names by returning initials. e.g., "Mike" -> "m"
 */
export const generatePinyinInitials = async (name: string): Promise<string> => {
  if (!name) return '';
  const cleanName = name.trim();

  try {
    // Check if purely English/Latin
    if (/^[a-zA-Z\s]+$/.test(cleanName)) {
        const parts = cleanName.split(/\s+/);
        // Return first char of up to first 2 words
        return parts.slice(0, 2).map(p => p[0]).join('').toLowerCase();
    }

    // Use pinyin-pro for Chinese
    // pattern: 'first' gets the first letter of each pinyin
    // toneType: 'none' removes tones
    // type: 'array' returns array of initials
    const initials = pinyin(cleanName, { 
        pattern: 'first', 
        toneType: 'none', 
        type: 'array' 
    });

    if (Array.isArray(initials)) {
        return initials.join('').toLowerCase();
    }
    
    return cleanName.substring(0, 2).toLowerCase();
  } catch (error) {
    console.warn("Pinyin conversion failed:", error);
    // Ultimate fallback
    return cleanName.substring(0, 2).toLowerCase();
  }
};
