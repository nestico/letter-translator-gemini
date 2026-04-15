import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// Vercel Serverless Function Configuration - explicitly forces 300s timeout limit (Vercel Pro max)
// This prevents 10s default timeouts that abruptly kill the process for standard accounts.
export const maxDuration = 300;
export const config = {
    maxDuration: 300
};

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
            console.log(`[Gemini] Attempt ${i + 1} for content generation...`);
            const result = await model.generateContent(contentParts);
            return result;
        } catch (error: any) {
            const isRateLimit = error.message?.includes('429') || error.status === 429;
            const isOverloaded = error.message?.includes('503') || error.status === 503;

            if ((isRateLimit || isOverloaded) && i < retries - 1) {
                const jitter = Math.random() * 1000;
                const delay = (initialDelay * Math.pow(2, i)) + jitter;
                console.warn(`[Gemini] retryable error on attempt ${i + 1}. Waiting ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
};

export default async function handler(req: any, res: any) {
    // 1. TOP-LEVEL GLOBAL CATCHER: Ensure we ALWAYS return JSON
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        // ============================================================
        // SECURITY: Verify the caller has a valid Supabase session (H-1)
        // ============================================================
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized. No valid session token provided.' });
        }

        const token = authHeader.split('Bearer ')[1];
        try {
            const { createClient } = await import('@supabase/supabase-js');
            const sbUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
            const sbKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
            if (sbUrl && sbKey) {
                const sb = createClient(sbUrl, sbKey);
                const { data: { user }, error: authError } = await sb.auth.getUser(token);
                if (authError || !user) {
                    return res.status(401).json({ error: 'Unauthorized. Invalid or expired session.' });
                }
                console.log(`[Auth] Verified user: ${user.email}`);
            }
        } catch (authErr) {
            console.error('[Auth] Verification failed:', authErr);
            return res.status(401).json({ error: 'Unauthorized. Session verification failed.' });
        }

        const { images, sourceLanguage, targetLanguage } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API Key is missing on the server configuration.' });
        }

        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: 'No images provided for translation.' });
        }

        const lowerLang = (sourceLanguage || '').toLowerCase();

        // Model routing: Use the best available models as of March 2026
        // - gemini-3.1-pro-preview: Latest & most intelligent, best OCR for dense non-Latin scripts
        // - gemini-2.0-flash: Stable GA model, fast & cost-effective for Latin scripts
        // - gemini-3-flash-preview was DEPRECATED on March 9, 2026 — do NOT use
        const MODEL_CONFIG = {
            complex: {
                primary: "gemini-3.1-pro-preview",   // Cutting-edge for Tamil, Telugu, Amharic, Tigrigna
                fallback: "gemini-2.0-flash"          // Stable GA fallback
            },
            standard: {
                primary: "gemini-2.0-flash",          // Fast & reliable for Spanish, French, etc.
                fallback: "gemini-2.0-flash"          // Same stable GA model as safety net
            }
        };

        const isComplexLanguage = lowerLang.includes('tigrigna') ||
            lowerLang.includes('amharic') ||
            lowerLang.includes('telugu') ||
            lowerLang.includes('tamil');

        const activeModelChain = isComplexLanguage ? MODEL_CONFIG.complex : MODEL_CONFIG.standard;
        let activeModelName = activeModelChain.primary;

        console.log(`[Gemini API] Primary Target: ${activeModelName} | Language: ${sourceLanguage} | Pages: ${images.length}`);

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: activeModelName,
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,
                topP: 0.8,
                topK: 40,
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
            lowerLang.includes(key.toLowerCase())
        ) || "General";

        // @ts-ignore
        const rules = LANGUAGE_SPECIFIC_RULES[languageKey] || LANGUAGE_SPECIFIC_RULES["General"];
        const generalRules = LANGUAGE_SPECIFIC_RULES["General"];

        // 2. RESILIENT SUPABASE FETCH: Never let DB failure crash the AI pipeline
        let goldenReferencePrompt = "";
        try {
            const { createClient } = await import('@supabase/supabase-js');
            const sbUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
            const sbKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

            if (sbUrl && sbKey) {
                const sb = createClient(sbUrl, sbKey);
                const { data: goldenRefs, error: dbErr } = await sb
                    .from('translations')
                    .select('transcription, translation')
                    .eq('is_golden', true)
                    .eq('source_language', sourceLanguage)
                    .order('created_at', { ascending: false })
                    .limit(2);

                if (!dbErr && goldenRefs && goldenRefs.length > 0) {
                    goldenReferencePrompt = "\n\n**GOLDEN REFERENCE EXAMPLES (FOLLOW THIS STYLE)**:\n";
                    goldenRefs.forEach((ref: any, idx: number) => {
                        goldenReferencePrompt += `Example ${idx + 1}:\n- NATIVE: ${ref.transcription}\n- CORRECT ENGLISH: ${ref.translation}\n\n`;
                    });
                }
            }
        } catch (e) {
            console.error("[Supabase] Silent failure fetching golden references:", e);
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
    "headerInfo": { "childId": "...", "childName": "...", "date": "..." }, // IMPORTANT: "date" MUST be in English as "Month Day, Year" format (e.g. "March 15, 2026"). If the full day AND month AND year are NOT all clearly visible on the letter (e.g. only a year like "2026" is found, or no date at all), return exactly the string "null". Do NOT invent or assume a month or day.
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

        let result;
        let response;
        try {
            result = await generateWithRetry(model, contentParts);
            response = await result.response;
        } catch (initialError: any) {
            // Check for 404/Not Found indicating deprecated preview model
            if (initialError.status === 404 || initialError.message?.includes('404') || initialError.message?.includes('models/')) {
                console.warn(`[Gemini API] Primary model ${activeModelName} unavailable (404). Falling back to ${activeModelChain.fallback}...`, initialError.message);
                activeModelName = activeModelChain.fallback;
                const fallbackModel = genAI.getGenerativeModel({
                    model: activeModelName,
                    generationConfig: model.generationConfig
                });
                result = await generateWithRetry(fallbackModel, contentParts);
                response = await result.response;
            } else {
                throw initialError; // Throw other errors (like auth, quota, etc.)
            }
        }

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

        try {
            const parsed = JSON.parse(text);

            if (parsed.confidenceScore !== undefined && parsed.confidenceScore < 0.7) {
                parsed._flagged = true;
                parsed._flagReason = `Low confidence (${Math.round(parsed.confidenceScore * 100)}%). Please review carefully before saving.`;
            }
            parsed._modelUsed = activeModelName;

            return res.status(200).json(parsed);
        } catch (jsonErr) {
            console.error("[Gemini] Invalid JSON returned from AI:", text);
            return res.status(500).json({ error: "The AI returned an invalid format. Please try again.", raw: text.substring(0, 100) });
        }

    } catch (error: any) {
        console.error("❌ CRITICAL SERVER ERROR:", error);

        const status = error.status || 500;
        const msg = error.message || 'Unknown Server Error';

        // Ensure even catastrophic errors return JSON to avoid "Unexpected token A" in frontend
        return res.status(status).json({
            error: `Server Error: ${msg}`,
            code: error.code || 'INTERNAL_ERROR'
        });
    }
}
