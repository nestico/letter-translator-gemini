# Product Requirements Document (PRD): Letter Translator Gemini

## 1. Executive Summary
**Letter Translator Gemini** is a specialized, AI-powered platform designed for **Children Believe** to facilitate the accurate and culturally sensitive translation of handwritten child sponsorship letters. By leveraging Google's Gemini 3.1 Multimodal models, the platform bridges the communication gap between children in regional programs (Ethiopia, India, Nicaragua, etc.) and their international sponsors.

## 2. Target Audience
*   **Regional Program Staff (Staff Group)**: Field workers and office staff who process incoming handwritten letters.
*   **Organizational Administrators (Admin Group)**: Management personnel requiring oversight on global translation volume, staff productivity, and system accuracy.

## 3. Core Features

### 3.1. Multimodal Translation Pipeline
*   **OCR & AI Interpretation**: Single-pass processing of handwritten images to generate both a native script transcription and a literal translation into the selected target language.
*   **Source Language Support**: 
    *   **Ethiopia**: Amharic, (ETH) Tigrigna, (ETH) Afan Oromo.
    *   **India**: (IND) Telugu, (IND) Tamil.
    *   **Latin America**: (NIC) Spanish, (HND) Spanish, (PRY) Spanish, (BRA) Portuguese.
    *   **Burkina Faso / Canada**: (BFA) French, (CAN) English.
    *   **Others**: German, Italian, Dutch, Latin, Russian, Chinese, Japanese.
*   **Target Language Support (Bidirectional)**: English (default), Spanish, French, Portuguese, Telugu, Tamil, Amharic, Afan Oromo, Tigrigna. Child letters can go into English for sponsors, and sponsor letters can go from English into the child's language. The server only accepts targets from this allow-list, and same-language pairs are rejected.
*   **Linguistic Guardrails**: Specialized personas (e.g., "Tigrigna Language Expert") with specific instructions to maintain 100% literal fidelity for sensitive humanitarian contexts.

### 3.2. Golden Reference Learning (Human-in-the-Loop)
*   **Ground Truth Ingestion**: Ability to mark professional human translations as "Golden References."
*   **Few-Shot Support**: The AI dynamically retrieves the most relevant expert examples to improve accuracy for complex scripts and regional dialects.

### 3.3. Secure Administration & Analytics
*   **RBAC (Role-Based Access Control)**: Tiered access managed via Supabase Profiles (Staff vs. Admin).
*   **Analytics Dashboard**: Visual tracking of global document volume, geographic distribution, and weekly output trends.
*   **Staff Impact Scoring**: Automated tracking of individual staff contributions and document processing volume.

### 3.4. Child Safeguarding: Sensitive Data Detection
*   **Flag & Warn**: After translation, the transcription and translation are scanned for emails, phone numbers, web links, and social media handles or app names (WhatsApp, Facebook, Instagram, etc.).
*   **Review Gate**: A "Sensitive Data Detected" banner lists each finding. **Approve & Save** and **Export PDF** stay disabled until staff tick a confirmation that they reviewed the details.
*   **Live Re-check**: Detection runs on the edited text, so removing the details via "Edit Text" clears the banner. Any new finding requires a fresh confirmation.
*   **False-Positive Controls**: Dates, the letter's Child ID, and amounts are ignored. 8-digit local numbers are only flagged with a "+" prefix or a nearby phone keyword. Children Believe's own domains are never flagged.
*   **Known Limitation**: Detection covers text only. Contact details remain visible in the original letter images embedded in the PDF.

### 3.5. Export & Workflow
*   **PDF Generation**: Branded export of translated letters containing the original letter images, then **Child ID**, **Program Name**, **Program Code**, Child Name, Date and the translation on separate lines for visual flow. The translation uses the Noto Sans font for the target language's script. Header labels and dates remain in English ("Month Day, Year").
*   **History Logs**: Per-user audit trail capturing the auto-detected language, and the accurately extracted **Beneficiary Name** and **Beneficiary ID**.

## 4. Technical Architecture
*   **Frontend**: React (Vite) with a premium, responsive design system.
*   **Backend/API**: Vercel Serverless Functions (Node.js/TypeScript).
*   **Database & Auth**: Supabase (PostgreSQL with RLS, Supabase Auth).
*   **AI Engine**: Hybrid Google Gemini (Dynamic routing between **3.1 Pro Preview** for complex scripts and **3.5 Flash** for cost-efficiency, with fallbacks to 3.5 Flash and 3.1 Flash-Lite respectively).
*   **OCR (Fallback/Primary)**: Azure Computer Vision (as needed for standard scripts).

## 5. Success Metrics
1.  **Translation Accuracy**: Measured as a high correlation (90%+) between AI output and "Golden Reference" samples.
2.  **Processing Speed**: Average end-to-end translation time under 15 seconds.
3.  **Regional Adoption**: Usage volume across 7+ regional offices.
4.  **Admin Oversight**: 100% visibility into staff productivity and low-confidence alerts.

## 6. Future Roadmap
*   **Regional Filtering**: Granular analytics based on the specific regional office of the staff member.
*   **Bulk Processing**: Uploading entire batches of letters for automated queue processing.
*   **Linguistic Feedback Loop**: In-app interface for admins to correct AI output and immediately convert it to a new "Golden Reference."
*   **Model Lifecycle Management**: Automated checks and upgrades for Gemini model versions to prevent service disruption.
*   **Smart Model Toggle (Implemented)**: Dynamic routing (`gemini-3.1-pro-preview` when the source or target is Tamil/Telugu/Amharic/Tigrigna, `gemini-3.5-flash` for Latin scripts) to maximize OCR accuracy while minimizing global costs.
*   **Bidirectional Translation (Implemented Oct 2026)**: Selectable target language, see 3.1.
*   **Sensitive Data Flag & Warn (Implemented Oct 2026)**: See 3.4.
*   **Sensitive Data — Next Steps**: Optional auto-redaction of contact details in text, AI-assisted detection for details written out in words, and image blurring or omitting original pages from the PDF for flagged letters.
*   **Target-Language Golden References**: Curate golden references for non-English targets (e.g. English → Spanish). The existing golden references are native → English, so other directions run without few-shot examples until matching references are added.
