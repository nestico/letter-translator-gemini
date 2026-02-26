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
                temperature: 1.0,
                presencePenalty: 1.0,
                frequencyPenalty: 1.5,
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
