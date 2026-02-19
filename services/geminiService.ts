import { queueRequest } from "./queueService";
import { TranslationResult } from "../types";

export const translateImage = async (
  images: { base64: string; mimeType: string }[],
  sourceLanguage: string = 'Auto-Detect',
  targetLanguage: string = 'English',
  onQueueUpdate?: (position: number) => void
): Promise<TranslationResult> => {

  // Calculate approximate size. Guard against huge payloads.
  const totalPayloadSize = JSON.stringify({ images, sourceLanguage, targetLanguage }).length;
  if (totalPayloadSize > 19 * 1024 * 1024) { // 19MB Safety buffer
    console.warn("Payload approaches 20MB limit. Ensure images are compressed.");
    throw new Error("Payload is too large (>20MB). Please compress images or reduce resolution to prevent API failure.");
  }

  // Define the core generation task calling our serverless API
  const generateTask = async (): Promise<TranslationResult> => {
    const startTime = performance.now();
    console.log(`[Gemini API] Requesting translation via serverless endpoint. Images: ${images.length}`);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images,
          sourceLanguage,
          targetLanguage
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();

      const endTime = performance.now();
      console.log(`[Gemini API] Completed in ${((endTime - startTime) / 1000).toFixed(2)}s`);

      return data;

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
  return {
    sendMessage: async (message: string) => {
      return { response: { text: () => "Chatbot backend update pending." } };
    }
  };
};
