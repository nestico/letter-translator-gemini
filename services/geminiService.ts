import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

const LANGUAGE_SPECIFIC_RULES = {
  "Telugu": {
    role: "Telugu Script Expert",
    special_instructions: "Pay special attention to the distinction between the Child (beneficiary) and the Writer (scribe/parent). Do not confuse their identities. Look for specific mentions of seasonal crops (Mangoes, Jamun), festivals (Sankranti), and school details.",
    negative_constraints: ["Do not invent Christmas", "Do not invent Goats", "Do not invent Rice", "Do not invent Temples"]
  },
  "Amharic": {
    role: "Specialist Amharic Archivist",
    special_instructions: "100% LITERAL FIDELITY. Use trusted reference data. Look for specific characters like 'ፍየል' (goat) only if visually present. Identify the child's name accurately.",
    negative_constraints: ["Do not summarize", "Do not simplify", "Do not invent generic blessings"]
  },
  "Spanish": {
    role: "Latin American Spanish Specialist",
    special_instructions: "Maintain regional dialect nuances. Distinguish between distinct handwritten styles if multiple people wrote on the document.",
    negative_constraints: []
  },
  "General": {
    role: "Child Sponsorship Letter Analyst",
    special_instructions: "Translate handwriting verbatim. Use writer context (e.g., if 'Written by Swapna', use 'I am Swapna').",
    negative_constraints: ["Do not invent boilerplate", "Do not hallucinate content not in the image"]
  }
};

// Retry helper with exponential backoff
const generateWithRetry = async (model: any, contentParts: any[], retries = 3, initialDelay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(contentParts);
      return result;
    } catch (error: any) {
      const isRateLimit = error.message?.includes('429') || error.status === 429;

      if (isRateLimit && i < retries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`Gemini 429 Rate Limit hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // If not rate limit or last retry, throw
      throw error;
    }
  }
};

export const translateImage = async (
  images: { base64: string; mimeType: string }[],
  sourceLanguage: string = 'Auto-Detect',
  targetLanguage: string = 'English'
) => {
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your .env file.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Use stable Gemini 2.0 Flash model
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      presencePenalty: 0.6, // Discourage repetition
      frequencyPenalty: 0.4, // Discourage frequent tokens
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          headerInfo: {
            type: SchemaType.OBJECT,
            properties: {
              childId: { type: SchemaType.STRING },
              childName: { type: SchemaType.STRING },
              date: { type: SchemaType.STRING }
            }
          },
          transcription: { type: SchemaType.STRING },
          translation: { type: SchemaType.STRING },
          detectedLanguage: { type: SchemaType.STRING },
          confidenceScore: { type: SchemaType.NUMBER }
        }
      }
    }
  });

  // Determine rules based on language
  const languageKey = Object.keys(LANGUAGE_SPECIFIC_RULES).find(key =>
    sourceLanguage.toLowerCase().includes(key.toLowerCase())
  ) || "General";

  // @ts-ignore
  const rules = LANGUAGE_SPECIFIC_RULES[languageKey] || LANGUAGE_SPECIFIC_RULES["General"];
  const generalRules = LANGUAGE_SPECIFIC_RULES["General"];

  const prompt = `
  You are a ${rules.role}.
  
  **TASK**: 
  1. Analyze the provided handwritten letter images (which may span multiple pages).
  2. Transcribe the text exactly as written in its original language.
  3. Translate the text into clear, modern ${targetLanguage}.
  4. Identify the original language.

  **PERSONA & TONE**:
  - **First-Person Persona**: You ARE the child or the family member writing the letter. Use first-person pronouns (I, we, my) exactly as they appear in the handwriting. Never use "The child says..." or "She writes...".
  - **First-Person Exit**: Sign off ONCE as the writer and then END the response.
  - **Verbatim Translation**: Do not summarize, interpret, or provide context about the letter. Provide only the direct, warm translation of the words on the page.

  **RULES & CONSTRAINTS**:
  - **Hard Stop**: Stop immediately after the final closing signature of the letter. Do not repeat greetings, blessings, or names.
  - **Single High-Fidelity Pass**: Synthesize all pages into one coherent translation. Do not provide a summary or preview. Provide ONLY ONE continuous translation for all pages combined.
  - **Singularity**: Provide exactly one version of the translation. Do not repeat the letter body. STOP immediately after the signature.
  - **Merge Narratives**: Merge Page 1 and Page 2 into one continuous narrative without restarting the introduction.
  - **Avoid Repetition**: Finish the letter naturally as it is written. Do not add repetitive blessings or greetings that are not present in the original text.
  - **Metadata separation**: Extract metadata (Child Name, ID, Date) strictly into the 'headerInfo' JSON object. Do not repeat these details inside the 'translation' field.
  - **Conciseness**: The total length of the naturalEnglish field must be proportionate to the source text. Do not hallucinate additional content.
  - **Cultural Anchors**: Maintain strict fidelity to specific terms (e.g., 'Sankranti', 'cousin sister', 'cousin brother') as they appear in the text.
  
  - **Metadata Rules**: ${generalRules.special_instructions}
  - **Specific Instructions**: ${rules.special_instructions}
  - **NEGATIVE CONSTRAINTS**: ${[...generalRules.negative_constraints, ...rules.negative_constraints].join(", ")}.

  **OUTPUT FORMAT (JSON)**:
  {
    "headerInfo": {
        "childId": "...",
        "childName": "...",
        "date": "..."
    },
    "transcription": "Verbatim transcription in original script...",
    "translation": "English translation (Metadata excluded)...",
    "detectedLanguage": "Language Name",
    "confidenceScore": 0.0 to 1.0
  }
  `;

  const contentParts: any[] = [prompt];

  // Add all images - Batch Control (Single Request)
  images.forEach(img => {
    contentParts.push({
      // @ts-ignore
      inlineData: {
        data: img.base64,
        mimeType: img.mimeType
      }
    });
  });

  try {
    // Wrapped in retry logic
    const result = await generateWithRetry(model, contentParts);
    const response = await result.response;
    let text = response.text();

    // Safety Force-Close JSON if truncated
    text = text.trim();
    if (!text.endsWith("}")) {
      console.warn("JSON response incomplete. Attempting to force-close...");
      // If it looks like it was cut off in a string value
      if (text.lastIndexOf('"') > text.lastIndexOf('}')) {
        text += '"}';
      } else {
        text += '}';
      }
    }

    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error("JSON Parse Failed on:", text);
      throw new Error("Failed to parse Gemini response. The output may have been truncated.");
    }

  } catch (error) {
    console.error("Gemini Translation Error:", error);
    throw error;
  }
};

export const createChatSession = () => {
  // Placeholder for now, as the main request was about translation service
  return {
    sendMessage: async (message: string) => {
      return { response: { text: () => "Chatbot backend update pending." } };
    }
  };
};
