import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

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

const generateWithRetry = async (model: any, contentParts: any[], retries = 3, initialDelay = 2000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const result = await model.generateContent(contentParts);
            return result;
        } catch (error: any) {
            const isRateLimit = error.message?.includes('429') || error.status === 429;
            const isOverloaded = error.message?.includes('503') || error.status === 503;

            if ((isRateLimit || isOverloaded) && i < retries - 1) {
                const jitter = Math.random() * 1000;
                const delay = (initialDelay * Math.pow(2, i)) + jitter;
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
};

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { images, sourceLanguage, targetLanguage } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Gemini API Key is missing on the server.' });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2, // Lower temperature for more stable/literal translation
                topP: 0.8,
                topK: 40,
                // Removed stopSequences to prevent truncated JSON if the model is wordy
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

        const languageKey = Object.keys(LANGUAGE_SPECIFIC_RULES).find(key =>
            sourceLanguage.toLowerCase().includes(key.toLowerCase())
        ) || "General";

        // @ts-ignore
        const rules = LANGUAGE_SPECIFIC_RULES[languageKey] || LANGUAGE_SPECIFIC_RULES["General"];
        const generalRules = LANGUAGE_SPECIFIC_RULES["General"];

        const prompt = `
  You are an expert ${rules.role}.

  **CONTEXT**: This is a sponsorship letter from a child to their sponsor.
  1. **The Header**: Usually contains "Child Name", "Child ID", and "Written by" (the Scribe).
  2. **The Scribe**: If "Written by: Swapna" is listed, and the child is "Rapuri Srivalli", then Swapna is writing on behalf of Srivalli. Swapna might be an older sister, parent, or volunteer.
  3. **The Voice**: The translation should be in the FIRST PERSON of the letter's speaker.

  **INSTRUCTIONS**:
  1. **Read ALL Images**: Analyze up to 3 images as ONE continuous letter.
  2. **Single Translation**: Output exactly ONE continuous English translation. Do NOT repeat the translation or loop the content.
  3. **No Redundancy**: If a "Dear Sponsor" greeting appears on Page 1, do not invent a second greeting for Page 2.
  4. **Verification**: After translating, check: "Is there any non-English script in the translation? Is the text repeating?". Remove any script markers and repetitions.

  **SPECIFIC RULES**: ${rules.special_instructions}
  **NEGATIVE CONSTRAINTS**: ${[...generalRules.negative_constraints, ...rules.negative_constraints].join(", ")}.

  **JSON STRUCTURE**:
  {
    "headerInfo": { "childId": "...", "childName": "...", "date": "..." },
    "transcription": "...",
    "translation": "English Only Text...",
    "detectedLanguage": "...",
    "confidenceScore": 0.9
  }
  `;

        const contentParts: any[] = [prompt];
        images.forEach((img: any) => {
            contentParts.push({
                inlineData: {
                    data: img.base64,
                    mimeType: img.mimeType
                }
            });
        });

        const result = await generateWithRetry(model, contentParts);
        const response = await result.response;
        let text = response.text();

        // Safety Force-Close JSON if truncated
        text = text.trim();
        if (!text.endsWith("}")) {
            if (text.lastIndexOf('"') > text.lastIndexOf('}')) {
                text += '"}';
            } else {
                text += '}';
            }
        }

        const parsed = JSON.parse(text);
        return res.status(200).json(parsed);

    } catch (error: any) {
        console.error("Server-side Gemini Error:", error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
