import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { queueRequest } from "./queueService";

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
      const isOverloaded = error.message?.includes('503') || error.status === 503;

      if ((isRateLimit || isOverloaded) && i < retries - 1) {
        // Exponential Backoff + Jitter (Prevent Thundering Herd)
        // Base delay * 2^retries + random jitter (0-1000ms)
        const jitter = Math.random() * 1000;
        const delay = (initialDelay * Math.pow(2, i)) + jitter;

        console.warn(`Gemini Busy (429/503). Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // If not retryable or max retries reached, throw
      throw error;
    }
  }
};

export const translateImage = async (
  images: { base64: string; mimeType: string }[],
  sourceLanguage: string = 'Auto-Detect',
  targetLanguage: string = 'English',
  onQueueUpdate?: (position: number) => void
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
      temperature: 1.0, // High creativity/exploration to prevent "lazy" stops on Page 1
      presencePenalty: 1.0,
      frequencyPenalty: 1.5, // MAXIMAL discouragement of sentence looping
      stopSequences: ["END_OF_TRANSLATION"],
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
  1. You are analyzing a sequence of up to 3 images. You MUST scan every single image for text before starting the translation. Do not conclude that the letter is finished until image 3 (if present) has been read.
  2. Transcribe the text exactly as written in its original language.
  3. Translate the text into clear, modern ${targetLanguage}.
  4. Identify the original language.

  **PERSONA & TONE**:
  - **First-Person Persona (MANDATORY)**: You ARE the child or the family member writing the letter. Use "I", "me", and "my" exactly as they appear in the handwriting.
  - **PROHIBITED PHRASING**: NEVER use third-person phrases such as "The child says", "The boy mentions", "The writer is describing", "It is written that", or "She says".
  - **Direct Voice**: Speak directly to the recipient (sponsor) as if you are the one holding the pen.

  **RULES & CONSTRAINTS (STRICT)**:
  1. **Single Continuous Narrative**: You are analyzing ONE continuous multi-page letter. Read all images first. Synthesize the narrative into a single FIRST-PERSON translation. **If the text of a Spanish sentence is split between Image 1 and Image 2, bridge the words into a single continuous sentence. Do not restart the greeting logic for subsequent pages**.
  2. **Verbatim Fidelity**: Keep cultural anchors (e.g., "Sankranti", "cousin brother", "God bless you") exactly as written. Do not explain them in parentheses.
  3. **Dynamic Termination**: Only output the final JSON once the absolute end of the provided image stack is processed. If Image 2 contains a continuation of Image 1, keep the first-person "Yo" (I) persona consistent.
  4. **Binary Termination**: After the absolute final signature, append "END_OF_TRANSLATION" to signal completion. Output this token immediately after the signature and nowhere else.
  5. **No Repetition**: Once a greeting or blessing is translated, DO NOT repeat it at the end unless it is literally written twice.
  6. **System Judge (Self-Correction)**: Before finalizing the JSON, verify: 'Did I output the translation exactly once? Did I stop at the signature?'. remove repetitive gibberish.
  7. **Metadata Separation**:
     - Extract the Child's Name, Child ID, and Date ONLY into the 'headerInfo' JSON object.
     - **CRITICAL**: Do NOT include these details in the 'translation' text field. The 'translation' field must start directly with the salutation (e.g., "Dear Sponsor...").

  - **Specific Instructions**: ${rules.special_instructions}
  - **NEGATIVE CONSTRAINTS**: ${[...generalRules.negative_constraints, ...rules.negative_constraints].join(", ")}.

  **OUTPUT FORMAT (JSON)**:
  {
    "headerInfo": {
        "childId": "ID found on letter...",
        "childName": "Name found on letter...",
        "date": "Date found on letter..."
    },
    "transcription": "Verbatim transcription in original script...",
    "translation": "English translation starting with Dear Sponsor...",
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

  // Calculate approximate size (Base64 is ~1.33x original). Guard against huge payloads.
  const totalPayloadSize = JSON.stringify(contentParts).length;
  if (totalPayloadSize > 19 * 1024 * 1024) { // 19MB Safety buffer
    console.warn("Payload approaches 20MB limit. Ensure images are compressed.");
    throw new Error("Payload is too large (>20MB). Please compress images or reduce resolution to prevent API failure (413).");
  }

  // Define the core generation task
  const generateTask = async () => {
    // Performance Monitoring
    const startTime = performance.now();
    console.log(`[Gemini] Starting request with ${images.length} images. Payload size: ~${(totalPayloadSize / 1024 / 1024).toFixed(2)}MB`);

    try {
      // Wrapped in retry logic
      const result = await generateWithRetry(model, contentParts);

      // Log Latency
      const endTime = performance.now();
      console.log(`[Gemini] Request completed in ${((endTime - startTime) / 1000).toFixed(2)}s`);

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

  // Submit to Queue
  const { result, position } = queueRequest(generateTask);

  // Notify UI of queue position
  if (onQueueUpdate) {
    onQueueUpdate(position);
  }

  return result;
};

export const createChatSession = () => {
  // Placeholder for now, as the main request was about translation service
  return {
    sendMessage: async (message: string) => {
      return { response: { text: () => "Chatbot backend update pending." } };
    }
  };
};
