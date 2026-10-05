# Letter Translator: Project Context & Status Handoff
**Date:** April 10, 2026 (last updated October 5, 2026)

This document captures the latest comprehensive context, resolved issues, and outstanding items for the Letter Translator application to ensure seamless maintenance and future engineering workflows.

---

## Section 1: Application Overview, Tech Stack, and File Map

**What the app is:** 
An AI-powered document transcription and translation portal built for the NGO "Children Believe." It allows regional operations teams to upload handwritten letters (from sponsored children in varying languages/scripts) and uses Google Gemini to generate highly literal, context-aware translations formatted for PDF export. English is the default target; since October 2026 staff can also pick Spanish, French, Portuguese, Telugu, Tamil, Amharic, Afan Oromo or Tigrigna (e.g. a sponsor's English letter into Spanish). Translations are scanned for contact details before they can be saved or exported.

**Tech Stack:**
*   **Frontend:** React, TypeScript, Vite, Tailwind CSS
*   **Backend / Edge Logic:** Vercel Serverless Functions (`api/`)
*   **Database & Auth:** Supabase (PostgreSQL with Row-Level Security)
*   **AI Engine:** Google Gemini (Dynamic model routing)
*   **Export:** jsPDF + native browser File System Access API

**Key File Map:**
*   `components/TranslationView.tsx`: The core UI where image uploading, source/target language selection, dual-pane translation comparison, the sensitive data banner, and PDF generation occur.
*   `api/translate.ts`: The Vercel serverless proxy endpoint containing the critical model routing, target-language allow-list, AI prompt logic, and golden reference retrieval.
*   `services/sensitiveDataService.ts`: Detects emails, phone numbers, links and social media in letter text (flag only, never modifies text).
*   `services/pdfFontService.ts`: Registers the Noto Sans font for a language's script and returns the font family to use in the PDF.
*   `services/geminiService.ts`: Client-side wrapper managing compression and HTTP dispatch to the API.
*   `services/imageUtils.ts`: Handles crucial client-side canvas compression logic.
*   `REMEDIATION_PLAN.md`: The active source of truth for pending security and code-quality tasks.

---

## Section 2: Issue Resolution Log (9 Issues across 3 Phases)

We successfully triaged, investigated, and deployed fixes for 9 major issues spanning core function, user-reported anomalies, and security flaws:

### Phase 1: Core Bugs
1.  **Vercel Timeout Exhaustion** (`f4bf816`): Deployed `vercel.json` config adjusting `maxDuration` to 300s to allow Gemini complex-script analysis to complete safely without triggering 504 Gateway Timeouts.
2.  **PDF Header Overlap** (`01e64f6`, `f5db0ca`): Re-engineered the jsPDF coordinate logic to prevent Child ID and dates from rendering over text. 
3.  **JS Date Trap (-1 Day Shift)** (`bdfb8a3`, `a6bf934`): Handled JavaScript's notorious `YYYY-MM-DD` timezone offset shift that magically turned user input dates back to simply "January 1" on PDF outputs, converting to `Month Day, Year` instead.

### Phase 2: User-Reported Anomalies
4.  **Complex Script Destruction via Compression** (`e0c3540`, `e3a1254`): Users flagged Tamil & Amharic translations as gibberish. Root cause was standard image compression blurring complex ligatures. Expanded compression bounds dynamically to retain script fidelity while evading the Vercel 4.5MB limits.
5.  **Analytics Dashboard Under-counting** (`947194e`, `4cba373`): Restructured the analytics pipeline to query directly from the `translations` table rather than relying on a truncated activity feed, curing accurate 30-day reporting.
6.  **Missing Asian Fonts in PDFs** (`4a4c729`): Handled `jsPDF` fallback injection specifically for NotoSans fonts to ensure Tamil and Telugu outputs didn't render as undefined block squares.

### Phase 3: Security Audit Remediations
*Note: The 6 critical/high vulnerabilities from the recent audit were immediately patched.*
7.  **(C-1 / C-2) Credential & Environment Variable Leaks** (`141e569`): Stripped the unprotected `api/test.ts` endpoint leaking server env variable names, and purged hardcoded Supabase keys historically sitting in `import_truth.js`.
8.  **(H-1) Unauthenticated Translating** (`52ced90`): Forced `Bearer` JWT verification onto the Vercel `api/translate.ts` serverless route to stop unauthenticated direct API hitting.
9.  **(H-2 -> H-4) Secret Re-Architecture & Housekeeping** (`52ced90`): Refactored Azure Vision/OpenAI usage completely securely behind server endpoints, removing browser `VITE_` keys. Cleaned the root repo of 15+ stray `history.txt` and `.sql` log files.

---

## Section 3: Outstanding Items (as of October 5, 2026)

All Critical, High and Medium items (C-1/2, H-1 to H-4, M-1 to M-5) and the P1 Supabase RLS audit are resolved. See `REMEDIATION_PLAN.md` for details and commits.

**Informational / Improvements:**
*   **I-1:** Rate limiting on `api/translate.ts`.
*   **I-2:** Content Security Policy (CSP) headers in `vercel.json`.
*   **I-3:** Move Tailwind CSS off the runtime CDN to a locally built Vite integration.
*   **I-4:** Azure services kept intentionally for future use; `ocrService.ts` is dead code.
*   **I-5:** Automated model health check to catch Google model deprecations early.

**Child Safeguarding follow-ups (sensitive data):**
*   **CS-2:** Contact details remain visible in the original letter images embedded in the PDF.
*   **CS-3:** Details written out in words are not detected (possible AI-assisted detection).
*   **CS-4:** Optional auto-redaction, to be decided after staff use flag & warn.

**Product follow-ups:**
*   Curate golden references for non-English targets (current ones are native → English only).
*   Verify Tamil/Telugu PDF output when they are the target language (see Gotcha 7).
*   ChatBot decision, `TranslationView.tsx` decomposition, root directory cleanup.

---

## Section 3b: October 2026 Features

1.  **Bidirectional Translation** (`ad67d9e`): The confirmation modal now has an active Target Language dropdown. `api/translate.ts` validates the target against `ALLOWED_TARGET_LANGUAGES`, writes it into the prompt, routes to Gemini Pro when the source **or** target is a complex script, and filters golden references by `target_language` for non-English targets. The PDF renders the translation in the target language's font. Tigrigna now uses the Ethiopic font.
2.  **Sensitive Data Flag & Warn** (`3033f81`): After translation, the browser scans the edited transcription and translation for contact details. A red "Sensitive Data Detected" banner lists them, and Save/Export stay disabled until staff tick a review confirmation. Removing the details via Edit Text clears the banner.

---

## Section 4: Environment & Configuration Notes

*   **Hosting Context:** This must run on a **Vercel Pro** subscription. Hobby tiers enforce a hard 60s execution limit, which is categorically insufficient for heavy zero-shot OCR passes for Tigrigna/Amharic.
*   **Database:** Supabase acts as our source of truth. All tables must have Row Level Security (RLS) policies engaged. JWTs generated by the client dictate what rows a specific user can view. 
*   **Keys Architecture:** We heavily restrict anything beginning with `VITE_`. Only harmless configurations should hit the client. Any model keys (Gemini, Azure) exclusively reside as `process.env` variables inside the actual Vercel functions (`api/*`).

---

## Section 5: User Context

*   **Organization:** Children Believe (NGO). 
*   **The Operators:** Global field staff and regional scribes who intercept physical letters from sponsored children.
*   **Primary Regional Corridors:**
    *   *India:* Interfacing deeply with Telugu and Tamil.
    *   *Africa:* Ethiopia predominately dealing with Amharic, Tigrigna, and Afan Oromo. 
    *   *The Americas:* Latin/Spanish scripts. 
*   **Goal:** Protect the 100% literal translation of local dialects — refusing to "hallucinate" boilerplate (e.g. inventing Christmas celebrations when a child simply wrote a generic blessing).

---

## Section 6: The Critical Gotchas (Lessons Learned)

For anyone stepping into this codebase, observe the following landmines:

1.  **Google Model Deprecation:** Google routinely retires `-preview` variants, and even GA models (`gemini-2.0-flash` was shut down June 1, 2026). Always keep the `try/catch` fallback in `api/translate.ts` pointing at a current GA model (currently `gemini-3.5-flash`, with `gemini-3.1-flash-lite` as the standard fallback) or the platform will abruptly return 404s.
2.  **The JavaScript Date Shift:** Calling `new Date("2026-04-10")` in North American timezones instantly mutates to `2026-04-09` under the hood because JS parses YYYY-MM-DD as strict UTC, then snaps it backward into negative local offsets. Always forcibly append UTC notation or map dates manually.
3.  **Analytics Sourcing:** Never tally metrics off of "Activity Event" tables. They inevitably get truncated or skipped. Deep aggregations must read pure materialized records coming from the `translations` baseline table. 
4.  **The Image Compression Dilemma:** Vercel functions have a hard 4.5MB request body size cap. However, if client-side Canvas compression limits are dialed down too sharply, foreign scripts (Tamil looping characters) lose pixel data and the OCR will hallucinate entirely incorrect meanings. Balance is critical.
5.  **Dynamic Golden References (Few-Shot):** The core intelligence of the app requires pulling "Golden" or Ground-Truth references from Supabase dynamically and injecting them into the Gemini generation prompt. LLMs natively struggle with literal dialect extraction without these specific few-shot anchors guiding them.
6.  **Two Target-Language Lists:** The allowed targets live in both `api/translate.ts` (`ALLOWED_TARGET_LANGUAGES`) and `components/TranslationView.tsx` (`TARGET_LANGUAGES`). Adding a language to only one breaks it: the UI shows it but the server rejects it, or vice versa. A new non-Latin target also needs a font in `public/fonts` and a branch in `pdfFontService.ts`.
7.  **jsPDF and Complex Scripts:** jsPDF does not perform full glyph shaping, so Tamil and Telugu text in a PDF may show some characters in the wrong form even with the correct Noto font. This matters most now that these can be **target** languages. Check a real export before relying on it.
8.  **Sensitive Data Detection is Text-Only:** The flag & warn check reads the transcription and translation, not the images. Phone detection is tuned to avoid dates, Child IDs and amounts, so 8-digit local numbers are only flagged with a "+" prefix or a nearby phone keyword.
