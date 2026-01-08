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
    base64Image: string,
    mimeType: string,
    sourceLanguage: string = 'Auto-Detect',
    targetLanguage: string = 'English'
): Promise<TranslationResult> => {
    try {
        const prompt = `
    You are an expert paleographer and translator specializing in historical handwritten letters.
    
    Task:
    1. Transcribe the handwritten text in this image exactly as it appears, preserving original spelling/grammar.
    2. Detect the language of the handwriting.
    3. Translate the text into ${targetLanguage}.
    ${sourceLanguage !== 'Auto-Detect' ? `Note: The source language is likely ${sourceLanguage}.` : ''}

    Output format (JSON):
    {
      "transcription": "The exact transcription...",
      "translation": "The translation...",
      "detectedLanguage": "The detected language name",
      "confidenceScore": 0.95
    }
    `;

        const response = await client.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant designed to output JSON."
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${mimeType};base64,${base64Image}`,
                                detail: "high"
                            }
                        }
                    ]
                }
            ],
            model: deployment,
            response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content;
        if (!content) throw new Error("No content received from Azure OpenAI");

        const parsed = JSON.parse(content);
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
