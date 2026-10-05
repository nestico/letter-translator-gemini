<div align="center">
  <h1>Letter Translator</h1>
  <p>Decipher and translate handwritten letters with the power of Google Gemini AI.</p>
</div>

## Overview
**Letter Translator** is an intelligent web application designed to help users decipher, transcribe, and translate handwritten documents. Whether it's an old family letter or a historical document, this tool leverages advanced AI models to convert difficult handwriting into clear, digital text and translate it into your preferred language.
- **Implementation**: Stabilized model routing with `gemini-3.1-pro-preview` for complex scripts and `gemini-3.5-flash` for standard languages, with automatic fallback models and a 300s Vercel Pro timeout.

## Key Features
- **AI Engine**: Hybrid Google Gemini (Dynamic routing between **3.1 Pro Preview** for dense non-Latin scripts and **3.5 Flash** for speed/cost-efficiency).
- **Multi-Language Support**: Auto-detects the source language (Amharic, Tigrigna, Afan Oromo, Telugu, Tamil, Spanish, English, etc.).
- **Selectable Target Language**: Translate into English (default), Spanish, French, Portuguese, Telugu, Tamil, Amharic, Afan Oromo or Tigrigna. This supports both directions, e.g. a child's Tamil letter into English, or a sponsor's English letter into Spanish. Same-language pairs are blocked.
- **Sensitive Data Detection**: Scans the transcription and translation for emails, phone numbers, web links and social media handles/apps. A "Sensitive Data Detected" banner lists each item, and saving/exporting stays disabled until staff confirm they reviewed it.
- **Golden Reference Learning**: Leverages verified "Ground Truth" data for high-accuracy few-shot translation of complex humanitarian content.
- **Smart Image Processing**: 
  - Upload images (PNG, JPG) or PDF documents.
  - Built-in rotation tools to correct scanned orientation.
  - **Multi-Page Support**: Intelligent stitching of multiple pages into a single coherent narrative.
- **Translation Workspace**: 
  - Dual-pane view for comparing original text with the translation.
  - Editable transcription and translation fields for manual corrections.
- **Robust Export Options**: 
  - **PDF Export**: Generates a professional report with the original letter images followed by a translation page containing the **Child ID**, **Program Name**, **Program ID**, **Child Name**, **Date** and the **Translation**. The translation is rendered with the Noto Sans font for the target language's script (Latin, Tamil, Telugu or Ethiopic).
  - **Text Export**: Simple `.txt` download with the translation and the original transcription.
  - Uses native **File System Access API** for reliable file saving.
- **User Accounts & History**: Supabase integration for secure user authentication. Visually tracks **Child Names**, **Child IDs**, and auto-detected languages directly inside a searchable History view.
- **Privacy & Training**: 
  - **Smart Model Toggle**: Dynamic routing (`gemini-3.1-pro-preview` when the source OR target is Tamil/Telugu/Amharic/Tigrigna, `gemini-3.5-flash` for Latin scripts) to maximize OCR accuracy while minimizing costs.
  - Support for local-only **Golden Reference Datasets** to improve translation accuracy for complex scripts (Tamil, Telugu, Amharic).

For a visual breakdown of the application architecture and data flow, see [ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md).

## Tech Stack
- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **AI Service**: Google Gemini 3 (@google/generative-ai)
- **Backend/Auth**: Supabase
- **PDF Generation**: jsPDF

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- A Google Gemini API Key
- A Supabase Project URL and Anon Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   cd letter-translator
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add the following keys:
   ```env
   # Google Gemini Configuration (server-side only — never prefix with VITE_)
   GEMINI_API_KEY=your_gemini_api_key

   # Supabase Configuration (public anon key, safe for the browser)
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   In production these are set as Vercel environment variables. Only harmless public values may use the `VITE_` prefix, because those are bundled into the browser.

4. **Run the development server:**
   ```bash
   npm run dev
   ```

## Usage
1. **Sign Up/Login**: Create an account to access the workspace.
2. **Upload**: Drag & drop your letter image or PDF.
3. **Pre-process**: Use the rotation tools to fix the image orientation if needed.
4. **Translate**: Choose the source language (or Auto-Detect) and the target language, then click "Confirm & Translate".
   - **Gemini 3.1 Pro Preview**: Assigned when the source or target is a complex script (Tamil, Telugu, Amharic, Tigrigna) for maximum accuracy.
   - **Gemini 3.5 Flash**: Assigned to standard languages (Spanish, French, English, etc.) for cost efficiency.
5. **Review sensitive data**: If the letter contains contact details, a red banner lists them. Remove them with "Edit Text", or tick the confirmation box to continue.
6. **Edit & Export**: Review the results, make edits if necessary, and click "Export" to save your work as a PDF or Text file.

## License
[MIT](LICENSE)
