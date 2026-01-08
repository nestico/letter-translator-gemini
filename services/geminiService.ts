import { GoogleGenerativeAI as GoogleGenAI, SchemaType } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

const PLACEHOLDER_KEY = "AIzaSyDtBsuC8kLHeY6JH3ma8VQXdAPbYhYC_Ck";

const getAi = () => {
  // Always log the status of the key for debugging
  console.log("Debug: apiKey type:", typeof apiKey);
  console.log("Debug: apiKey length:", apiKey?.length);


  if (apiKey === PLACEHOLDER_KEY) {
    console.error("CRITICAL: You are using the default placeholder API key. This will not work.");
    alert("You are using the placeholder API Key. Please update .env.local with your real Google Gemini API Key.");
    return null;
  }

  // Log first/last chars securely
  if (apiKey && apiKey.length > 8) {
    console.log(`Debug: Key starts with ${apiKey.substring(0, 5)}... and ends with ...${apiKey.substring(apiKey.length - 4)}`);
  }

  if (!ai) {
    if (!apiKey || apiKey === "undefined") {
      console.warn("Gemini API Key is missing or invalid (matches 'undefined'). Translation features will not work.");
      return null;
    }
    ai = new GoogleGenAI(apiKey);
  }
  return ai;
};

export const translateImage = async (base64Image: string, mimeType: string, sourceLanguage?: string, targetLanguage: string = 'English') => {
  const languagePrompt = sourceLanguage && sourceLanguage !== 'Auto-Detect'
    ? `The document is in ${sourceLanguage}.`
    : "Identify the original language.";

  try {
    if (apiKey) {
      console.log("Using Gemini API Key starting with:", apiKey.substring(0, 8) + "...");
    }

    const client = getAi();
    if (!client) throw new Error("Gemini API Key is missing");

    console.log("Debug: Sending request to Gemini...");
    // Initialize the specific model first
    const model = client.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            transcription: { type: SchemaType.STRING },
            translation: { type: SchemaType.STRING },
            detectedLanguage: { type: SchemaType.STRING },
            confidenceScore: { type: SchemaType.NUMBER }
          }
        }
      }
    });

    const response = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Image
        }
      },
      `Analyze this image of a handwritten letter. ${languagePrompt}
            1. Transcribe the text exactly as written in its original language.
            2. Translate the text into clear, modern ${targetLanguage}.
            3. Identify the original language.
            
            Return the response in JSON format.`
    ]);

    console.log("Debug: Received response from Gemini:", response);

    // Check if response is valid
    if (!response) {
      throw new Error("Received empty response from Gemini API");
    }

    // Try to get text safely, handling different SDK versions
    let text;
    if (typeof response.response && typeof response.response.text === 'function') {
      text = response.response.text();
    } else if (typeof response.response === 'string') { // Fallback if needed
      text = response.response;
    } else {
      // Fallback for unexpected structure
      console.warn("Unexpected response structure", response);
      // @ts-ignore
      text = response.response?.text?.() || response.text?.();
    }

    console.log("Debug: Extracted text:", text ? text.substring(0, 50) + "..." : "None");

    if (!text) throw new Error("No text content in response. Possible safety block or empty result.");

    return JSON.parse(text);
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
};


export const createChatSession = () => {
  const client = getAi();
  if (!client) {
    console.warn("Cannot create chat session: No API Key");
    return {
      sendMessage: async () => ({ response: { text: () => "Please add your API Key in .env to use the chatbot." } })
    } as any;
  }

  const model = client.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    systemInstruction: "You are an expert historian and archivist assistant. You help users understand historical contexts, archaic vocabulary, and details about handwritten letters they are translating. Keep answers concise and helpful."
  });

  return model.startChat({
    history: [],
    generationConfig: {
      maxOutputTokens: 1000
    }
  });
};
