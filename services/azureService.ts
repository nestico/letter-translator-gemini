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

        // ALWAYS use Multi-Stage (OCR First) if keys exist.
        // Even for Telugu/Amharic, OCR is critical for reading the English Header (Names, IDs, Dates).
        const isMultiStage = !!visionKey && !!visionEndpoint;

        let extractedText = "";

        if (isMultiStage) {
            console.log(`Starting Stage 1: Azure Vision OCR (Global Mode)...`);
            try {
                const ocrResults = await Promise.all(images.map(img => analyzeImage(img.base64)));
                extractedText = ocrResults.map((res, idx) => `--- Page ${idx + 1} ---\n${res.text}`).join('\n\n');
                console.log("OCR Stage Complete. Extracted Text Length:", extractedText.length);
            } catch (err) {
                console.warn("OCR Failed, proceeding with Visual-Only mode:", err);
            }
        }

        // Hybrid System Prompt: Combines OCR text (for headers) + Visual (for specific handwriting)
        let messages: any[] = [];

        const hybridSystemPrompt = `You are a specialist in analyzing "Child Sponsorship Letters".

**INPUTS PROVIDED:**
1. **Raw OCR Text**: Text extracted by a computer vision scanning engine. 
   - USE THIS for: Reading the English Form Headers (Child Name, ID, Date, "Written by").
   - IGNORE THIS for: Non-Latin handwriting if it looks like garbage characters.
2. **Original Images**: The actual scans of the letter.
   - USE THIS for: Reading the actual handwritten message in Telugu, Tamil, or Amharic.

**TASK 1: EXTRACT METADATA (From Header)**
- Look at the top of Page 1.
- Identify the **Child Name** (e.g., Rapuri Srivalli).
- Identify the **Writer** (e.g., "Written by: Swapna").
- Identify the **Date**.

**TASK 2: TRANSLATE HANDWRITING (From Body)**
- Translate the handwritten message verbatim.
- **CONTEXT**: Use the "Writer" found in the header to determine the speaker.
  - If "Written by: Swapna", the letter should start with something like "I am Swapna..." or "My greetings..." (Writer is a relative).
  - Do NOT say "My name is Rapuri Srivalli" if the writer is Swapna.
- **DETAILS**: Look for specific mentions of:
  - Holidays/Festivals (Independence Day, etc.)
  - Seasons/Climate (Rainy season, Summer)
  - Foods/Crops (Mangoes, Jamun)
  - School (7th Class)
  - Parents visits/Hostel life.
- **NEGATIVE CONSTRAINTS**: Do NOT invent "goats", "chili", "temples", or "Christmas".

**Output format (JSON):**
{
  "transcription": "The full transcription in the ORIGINAL SCRIPT (Telugu/Tamil)...",
  "translation": "[Writer: Swapna] ... The full English translation...",
  "detectedLanguage": "The detected language name",
  "confidenceScore": 0.95
}`;

        const content: any[] = [
            { type: "text", text: `Here is the Raw OCR Data:\n"""\n${extractedText}\n"""\n\nPlease analyze the following images:` }
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
            { role: "system", content: hybridSystemPrompt },
            { role: "user", content: content }
        ];

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
