import { queueRequest } from "./queueService";
import { TranslationResult } from "../types";

export const translateImage = async (
  images: { base64: string; mimeType: string }[],
  sourceLanguage: string = 'Auto-Detect',
  targetLanguage: string = 'English',
  onQueueUpdate?: (position: number) => void
): Promise<TranslationResult> => {

  // Calculate approximate size. VERCEL has a 4.5MB limit on request body.
  const totalPayloadSize = JSON.stringify({ images, sourceLanguage, targetLanguage }).length;
  if (totalPayloadSize > 4 * 1024 * 1024) { // 4MB Safety buffer for Vercel 4.5MB limit
    console.warn("Payload approaches Vercel 4.5MB limit. Ensure images are compressed.");
    throw new Error("Payload is too large for the server (>4.5MB). Please compress images or reduce resolution to prevent failure.");
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
        const errorText = await response.text();
        let errorMsg = `Server Error (${response.status})`;
        try {
          const errorData = JSON.parse(errorText);
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          // If not JSON, use a snippet of the HTML error
          errorMsg = errorText.substring(0, 100).replace(/<[^>]*>/g, '').trim() || errorMsg;
        }
        throw new Error(errorMsg);
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
