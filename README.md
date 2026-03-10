<div align="center">
  <h1>Letter Translator</h1>
  <p>Decipher and translate handwritten letters with the power of Google Gemini AI.</p>
</div>

## Overview
**Letter Translator** is an intelligent web application designed to help users decipher, transcribe, and translate handwritten documents. Whether it's an old family letter or a historical document, this tool leverages advanced AI models to convert difficult handwriting into clear, digital text and translate it into your preferred language.
- **Implementation**: Upgraded core translation handler to `gemini-3-flash-preview`, improving both reasoning capability and long-term stability.

## Key Features
- **AI Engine**: Hybrid Google Gemini 3 (Dynamic routing between **Pro 3.1** for complex scripts and **Flash** for cost-efficiency).
- **Multi-Language Support**: Auto-detects source language (Amharic, Tigrigna, Afan Oromo, Telugu, Tamil, Spanish, etc.) and translates to clear, modern English.
- **Golden Reference Learning**: Leverages verified "Ground Truth" data for high-accuracy few-shot translation of complex humanitarian content.
- **Smart Image Processing**: 
  - Upload images (PNG, JPG) or PDF documents.
  - Built-in rotation tools to correct scanned orientation.
  - **Multi-Page Support**: Intelligent stitching of multiple pages into a single coherent narrative.
- **Translation Workspace**: 
  - Dual-pane view for comparing original text with the translation.
  - Editable transcription and translation fields for manual corrections.
- **Robust Export Options**: 
  - **PDF Export**: Generates a professional report containing the **Child ID**, **Program Name**, **Program ID**, **Translation**, and **Transcription** on separated lines for visual clarity.
  - **Text Export**: Simple `.txt` download for raw content.
  - Uses native **File System Access API** for reliable file saving.
- **User Accounts & History**: Supabase integration for secure user authentication. Visually tracks **Child Names**, **Child IDs**, and auto-detected languages directly inside a searchable History view.
- **Privacy & Training**: 
  - **Smart Model Toggle**: Deployed dynamic routing system (gemini-3.1-pro-preview vs gemini-3-flash-preview) to maintain accuracy for Tigrigna/Amharic while minimizing global costs.
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
   # Google Gemini Configuration
   VITE_GEMINI_API_KEY=your_gemini_api_key

   # Supabase Configuration
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

## Usage
1. **Sign Up/Login**: Create an account to access the workspace.
2. **Upload**: Drag & drop your letter image or PDF.
3. **Pre-process**: Use the rotation tools to fix the image orientation if needed.
4. **Translate**: Confirm the languages and click "Decipher with AI".
   - **Gemini 3 Flash**: Assigned to all other languages (Spanish, French, etc.) for cost efficiency.
5. **Edit & Export**: Review the results, make edits if necessary, and click "Export" to save your work as a PDF or Text file.

## License
[MIT](LICENSE)
