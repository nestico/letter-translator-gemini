import { AzureOpenAI } from "openai";
import { ChatMessage, TranslationResult } from "../types";

const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
const apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
const deployment = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT;
const apiVersion = "2024-08-01-preview"; // Use a recent version that supports GPT-4o

if (!endpoint || !apiKey || !deployment) {
    console.error("Azure OpenAI credentials missing");
}

const client = new AzureOpenAI({
    endpoint,
    apiKey,
    apiVersion,
    deployment,
    dangerouslyAllowBrowser: true // Required for client-side usage
});

export const createChatSession = () => {
    let history: { role: "system" | "user" | "assistant"; content: string }[] = [
        {
            role: "system",
            content: "You are an expert historian and archivist assistant. You help users understand historical contexts, archaic vocabulary, and details about handwritten letters they are translating. Keep answers concise and helpful."
        }
    ];

    return {
        sendMessage: async (message: string) => {
            try {
                history.push({ role: "user", content: message });

                const response = await client.chat.completions.create({
                    messages: history,
                    model: deployment,
                });

                const reply = response.choices[0].message.content || "I couldn't generate a response.";
                history.push({ role: "assistant", content: reply });

                return {
                    response: {
                        text: () => reply
                    }
                };
            } catch (error) {
                console.error("Azure Chat Error:", error);
                throw error;
            }
        }
    };
};

import { analyzeImage } from './ocrService';

export const translateImage = async (
    images: { base64: string, mimeType: string }[],
    sourceLanguage: string = 'Auto-Detect',
    targetLanguage: string = 'English'
): Promise<TranslationResult> => {
    try {
        const visionKey = import.meta.env.VITE_AZURE_VISION_KEY;
        const visionEndpoint = import.meta.env.VITE_AZURE_VISION_ENDPOINT;

        console.log("DEBUG: Environment Variable Check");
        console.log("VITE_AZURE_VISION_KEY present:", !!visionKey);
        console.log("VITE_AZURE_VISION_ENDPOINT present:", !!visionEndpoint);

        // SMART ROUTING:
        // Azure Vision OCR (v3.2) is excellent for Latin scripts (English, Spanish, French) but struggles with
        // complex scripts like Amharic/Telugu handwriting.
        // STRATEGY: 
        // 1. If user explicitly selects a Latin language -> Use Text-Only OCR (Fast/Cheap).
        // 2. If 'Auto-Detect' or known complex script -> Use Visual GPT (Most Accurate for Handwriting).

        const ocrSafeLanguages = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch'];

        // Only trigger Multi-Stage (OCR First) if keys exist AND language is safe for OCR
        const isMultiStage = !!visionKey && !!visionEndpoint && ocrSafeLanguages.includes(sourceLanguage);

        let extractedText = "";

        if (isMultiStage) {
            console.log(`Starting Stage 1: Azure Vision OCR (Optimized for ${sourceLanguage})...`);
            const ocrResults = await Promise.all(images.map(img => analyzeImage(img.base64)));
            extractedText = ocrResults.map((res, idx) => `--- Page ${idx + 1} ---\n${res.text}`).join('\n\n');
            console.log("OCR Stage Complete. Extracted Text Length:", extractedText.length);
        } else {
            console.warn("Using Visual Intelligence (Legacy Mode). Reason:", !visionKey ? "Key Missing" : "Language better served by Visual Model");
        }

        // Stage 2: GPT Translation
        let messages: any[] = [];

        if (extractedText) {
            // --- TEXT ONLY MODE (OCR) ---
            const ocrSystemPrompt = `You are an expert linguist and paleographer specialized in recovering text from imperfect OCR.

Task:
1. You will receive raw OCR text from a form. 
2. ISOLATE the handwritten responses from the printed English boilerplate.
3. IGNORE standard headers like: "MY YEAR IN A NUTSHELL", "2025", "Supporter #", "Hi", "It's me!", "Right now, I'm learning", "MAIL TAG".
4. REPAIR and TRANSLATE the handwritten content.
   - CRITICAL: The OCR text might differ significantly from standard Latin text (e.g. "345 notär..." for Amharic). 
   - USE CONTEXT and PHONETIC matching to reconstruct the intended meaning.
   - If the text is completely garbled, mark it as [Unclear]. Do NOT invent a story.
5. Translate the reconstructed content into ${targetLanguage}.

${sourceLanguage !== 'Auto-Detect' ? `Note: The handwritten part is likely in ${sourceLanguage}.` : ''}

Output format (JSON):
{
  "transcription": "The transcribed/reconstructed handwriting...",
  "translation": "The English translation...",
  "detectedLanguage": "The detected language name",
  "confidenceScore": 0.8
}`;
            messages = [
                { role: "system", content: ocrSystemPrompt },
                { role: "user", content: `Here is the raw OCR text extracted from the document. strict_filter=true:\n\n"""\n${extractedText}\n"""` }
            ];

        } else {
            // --- VISUAL MODE (Legacy/Smart Fallback) ---
            // Used for Amharic, Telugu, or when OCR keys are missing.
            const visualSystemPrompt = `You are a translator assisting with a Child Sponsorship letter.
        
Context:
- The image contains a handwritten letter from a child (or social worker) to a sponsor.
- The handwriting is likely in ${sourceLanguage === 'Auto-Detect' ? 'Amharic or similar script' : sourceLanguage}.
- EXPECTED CONTENT: Updates on school (grade/class), family health, and specifically **items purchased with gift money** (e.g., goats, sheep, food, uniforms, supplies).

Task:
1. FOCUS STRICTLY on the handwritten message (usually in the box on the right).
2. Transcribe and Translate the handwriting into simple, direct English.
3. BE ACCURATE with details. 
   - If they mention buying a "goat" or "food", ensure that appears in the translation.
   - Do NOT use overly formal or flowery language (e.g., "mediation", "grace") unless explicitly written.
   - If the text is a standard greeting ("How are you? I am fine"), translate it simply.

Output format (JSON):
{
  "transcription": "The transcription of the HANDWRITTEN parts only...",
  "translation": "The English translation...",
  "detectedLanguage": "The detected language name",
  "confidenceScore": 0.95
}`;
            const content: any[] = [
                { type: "text", text: visualSystemPrompt }
            ];
            images.forEach(img => {
                content.push({
                    type: "image_url",
                    image_url: {
                        url: `data:${img.mimeType};base64,${img.base64}`,
                        detail: "high"
                    }
                });
            });
            messages = [
                { role: "system", content: "You are a helpful assistant designed to output JSON." },
                { role: "user", content: content }
            ];
        }

        const response = await client.chat.completions.create({
            messages: messages,
            model: deployment,
            response_format: { type: "json_object" }
        });

        const responseContent = response.choices[0].message.content;
        if (!responseContent) throw new Error("No content received from Azure OpenAI");

        const parsed = JSON.parse(responseContent);

        // If we have extractedText from OCR, prefer it over an empty transcription from GPT
        const finalTranscription = parsed.transcription && parsed.transcription.length > 20
            ? parsed.transcription
            : (extractedText || "No transcription available");

        return {
            transcription: finalTranscription,
            translation: parsed.translation || "No translation available",
            detectedLanguage: parsed.detectedLanguage || "Unknown",
            confidenceScore: parsed.confidenceScore || 0,
            ocrUsed: isMultiStage,
            rawOCR: extractedText
        };

    } catch (error) {
        console.error("Azure Translation Error:", error);
        throw error;
    }
};
