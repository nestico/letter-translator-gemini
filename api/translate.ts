import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const LANGUAGE_SPECIFIC_RULES = {
    "Telugu": {
        role: "Telugu Script Expert",
        special_instructions: "Pay special attention to the distinction between the Child (beneficiary) and the Writer (scribe/parent). Do not confuse their identities. Look for specific mentions of crops like Groundnut, Green Gram, and Maize. Identify specific locations like Gunadala Hill in Vijayawada. Do not overlook mentions of head-shaving ceremonies or specific age milestones (e.g., 15 months).",
        negative_constraints: ["Do not invent Christmas", "Do not invent Goats", "Do not invent Rice", "Do not invent Temples"]
    },
    "Tamil": {
        role: "Tamil Cultural Linguist",
        special_instructions: "Identify mentions of local committees like CFAM (Child Friendly Accountability Mechanism) and VDC (Village Development Committee). Look for festivals like Diwali, Vinayagar Chaturthi (processions with drums), and Children's Day (cake cutting). Recognize 'CLC (Creative Learning Centre)' and 'Nutrition Kits'. Identify mentions of speeches about Dr. Abdul Kalam. Distinguish between the child and mother's participation in community events organized by IRCDS.",
        negative_constraints: []
    },
    "Amharic": {
        role: "Specialist Amharic Archivist",
        special_instructions: "100% LITERAL FIDELITY. Use trusted reference data. Look for specific characters like 'ፍየል' (goat) only if visually present. Identify mentions of helping parents with water fetching and herding. Recognize 'Dear Barry Rokosh' or other specific sponsor names.",
        negative_constraints: ["Do not summarize", "Do not simplify", "Do not invent generic blessings"]
    },
    "Afan Oromo": {
        role: "Oromo Language Specialist",
        special_instructions: "Recognize mentions of 'Teff/Xaafi' and specific food supplies provided by gift money. Identify mentions of wise spending on clothes and family discussions. Ensure the narrative flows as a direct communication between child and sponsor.",
        negative_constraints: []
    },
    "Tigrigna": {
        role: "Tigrigna Language Expert",
        special_instructions: "100% LITERAL FIDELITY. Recognize mentions of 'Injera' and specific cultural markers. Pay special attention to sensitive contexts regarding war recovery, mentions of artificial legs (prosthetics), and medical follow-ups. Ensure the emotional tone of family loss or resilience is preserved exactly as written.",
        negative_constraints: ["Do not summarize", "Do not soften hard realities", "Do not invent generic hope if not present"]
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

// Deployment Trigger: 2026-02-23T10:05
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
                topP: 0.8,
                topK: 40,
                presencePenalty: 0.2,  // Softened from 1.0 to allow natural word recurrence
                frequencyPenalty: 0.3, // Softened from 1.5 to prevent content truncation
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

        // Fetch Golden References for Dynamic Learning
        let goldenReferencePrompt = "";
        try {
            const { supabaseServer } = await import("../services/supabaseServer");
            const { data: goldenRefs } = await supabaseServer
                .from('translations')
                .select('transcription, translation')
                .eq('is_golden', true)
                .eq('source_language', sourceLanguage)
                .order('created_at', { ascending: false })
                .limit(2);

            if (goldenRefs && goldenRefs.length > 0) {
                goldenReferencePrompt = "\n\n**GOLDEN REFERENCE EXAMPLES (FOLLOW THIS STYLE)**:\n";
                goldenRefs.forEach((ref: any, idx: number) => {
                    goldenReferencePrompt += `Example ${idx + 1}:\n- NATIVE: ${ref.transcription}\n- CORRECT ENGLISH: ${ref.translation}\n\n`;
                });
            }
        } catch (e) {
            console.error("Failed to load golden references:", e);
        }

        const prompt = `
  You are an expert ${rules.role}.

  **CONTEXT**: This is a sponsorship letter from a child to their sponsor.
  1. **The Header**: Usually contains "Child Name", "Child ID", and "Written by" (the Scribe).
  2. **The Scribe**: If "Written by: Swapna" is listed, and the child is "Rapuri Srivalli", then Swapna is writing on behalf of Srivalli. Swapna might be an older sister, parent, or volunteer.
  3. **The Voice**: The translation should be in the FIRST PERSON of the letter's speaker.

  **INSTRUCTIONS**:
  1. **Read ALL Images**: Analyze up to 3 images as ONE continuous letter.
  2. **COMPLETENESS MANDATE**: You MUST translate EVERY SINGLE handwritten detail found across ALL pages. Do not summarize, skip, or truncate. If the letter mentions crops, festivals, grades, or family members, include them all.
  3. **ABSOLUTE REPETITION BAN**: Do NOT repeat the exact same paragraph or large blocks of text multiple times. If you detect a loop, break it and move to the next unique content.
  4. **No Redundancy**: If a "Dear Sponsor" greeting appears once, do not invent it again for subsequent pages.
  5. **FINAL SIGNATURE TERMINATION**: Only conclude the translation when you reach the final signature/closing of the ENTIRE document (usually on the last page). Do not stop if a name appears mid-letter.
  6. **SYSTEM JUDGE**: Before finalizing the JSON, verify: "Did I include details from every image? Did I repeat paragraphs? Is the text non-English?".
  7. **TERMINATION**: Append the hidden token "END_OF_TRANSLATION" at the very end of your translation field content.

  ${goldenReferencePrompt}

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

        const isRateLimit = error.message?.includes('429') || error.status === 429;
        const isOverloaded = error.message?.includes('503') || error.status === 503;

        if (isRateLimit || isOverloaded) {
            return res.status(429).json({
                error: 'The AI service is temporarily busy due to high volume. Please wait about 5-10 minutes before retrying.',
                code: 'RATE_LIMIT_EXCEEDED'
            });
        }

        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
