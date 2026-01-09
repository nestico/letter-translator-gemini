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

export const translateImage = async (
    images: { base64: string, mimeType: string }[],
    sourceLanguage: string = 'Auto-Detect',
    targetLanguage: string = 'English'
): Promise<TranslationResult> => {
    try {
        const prompt = `
    You are an expert paleographer and translator.
    
    Task:
    1. Review ALL provided images as a single continuous document.
    2. Transcribe primarily the HANDWRITTEN text.
       - Focus strictly on the specific content written by the author.
       - Extract factual details explicitly (names, dates, locations, crops, foods, family members, festivals).
       - Do NOT summarize or generate generic polite phrases. If specific details are missing, do not invent them.
       - If the document is a form, ignore the printed boilerplate unless it's essential for context.
    3. Detect the language of the HANDWRITTEN text.
       - Ignore printed English form text for detection (e.g. "Nice to meet you").
       - If mixed, choose the handwritten language (e.g., 'Telugu', 'Spanish', 'Amharic').
    4. Translate the transcribed text into ${targetLanguage}.
       - Maintain the original tone and factual accuracy.
    ${sourceLanguage !== 'Auto-Detect' ? `Note: The source language is likely ${sourceLanguage}.` : ''}

    Output format (JSON):
    {
      "transcription": "The exact transcription in the original language...",
      "translation": "The English translation...",
      "detectedLanguage": "The detected language name",
      "confidenceScore": 0.95
    }
    `;

        const content: any[] = [
            { type: "text", text: prompt }
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

        const response = await client.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant designed to output JSON."
                },
                {
                    role: "user",
                    content: content
                }
            ],
            model: deployment,
            response_format: { type: "json_object" }
        });

        const responseContent = response.choices[0].message.content;
        if (!responseContent) throw new Error("No content received from Azure OpenAI");

        const parsed = JSON.parse(responseContent);
        return {
            transcription: parsed.transcription || "No transcription available",
            translation: parsed.translation || "No translation available",
            detectedLanguage: parsed.detectedLanguage || "Unknown",
            confidenceScore: parsed.confidenceScore || 0
        };

    } catch (error) {
        console.error("Azure Translation Error:", error);
        throw error;
    }
};
