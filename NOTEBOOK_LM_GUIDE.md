# NotebookLM Source Guide: Letter Translator Gemini

## 1. Project Overview
**Letter Translator Gemini** is a professional-grade AI platform built specifically for **Children Believe**. It is designed to bridge the communication gap between children in sponsored communities and their international sponsors by accurately translating handwritten letters into English while preserving literal and cultural fidelity.

## 2. The Core Problem
Handwritten letters from regional programs (Ethiopia, India, Nicaragua, etc.) are often:
- Written in complex non-Latin scripts (Amharic, Tigrigna, Telugu).
- Messy or poorly illuminated in photos.
- Filled with sensitive cultural context that standard Google Translate misses.
- Subject to strict **Child Safeguarding** privacy rules.

## 3. The Technical Solution (The Workflow)
Users (Staff and Admins) follow this high-security workflow:

### Step 1: Secure Authentication
- **Regional Login**: Staff log in using corporate credentials.
- **Role-Based Access**: Admins see global analytics; Staff see their specific regional impact.
- **Adaptive Security**: The system detects multiple failed attempts and offers a secure "Forgot Password" flow with email verification.

### Step 2: Multimodal Processing
- **Image Upload**: Users upload high-res photos or PDFs of handwritten letters.
- **AI Intelligence**: Powered by **Google Gemini 3.1 Flash**. The model doesn't just "read" the text; it performs **Multimodal Transcription** (seeing the image as a human would).
- **Golden Reference System**: The AI retrieves "Ground Truth" examples—past human-vetted translations—to ensure regional dialects are handled with 100% accuracy.

### Step 3: Verified Results
- **Native Script Transcription**: The app provides the exact text in the original language (e.g., Amharic characters).
- **Literal Translation**: A high-fidelity English translation focuses on accurately conveying the child's message without "hallucinations."
- **Exporting**: One-click professional PDF generation with organizational branding, ready for delivery to sponsors.

## 4. Administrative Oversight
The **Admin Dashboard** provides a bird's-eye view of:
- **Global Volume**: How many letters are processed across all 7 regional offices.
- **Geographic Distribution**: Which languages (Tigrigna, Telugu, Spanish) are most active.
- **Impact Scoring**: Tracking staff productivity and system accuracy trends.

## 5. Security & Privacy Facts
- **Child Protection**: No data is used to train public AI models.
- **Enterprise Storage**: All documents are stored in Supabase with **Row Level Security (RLS)**.
- **Retention**: Data is processed and stored according to organizational governance.

---
*This guide is intended to provide the context for AI-generated deep dives and educational podcasts via NotebookLM.*
