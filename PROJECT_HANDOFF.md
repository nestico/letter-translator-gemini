# Letter Translator: Project Context & Status Handoff
**Date:** April 10, 2026

This document captures the latest comprehensive context, resolved issues, and outstanding items for the Letter Translator application to ensure seamless maintenance and future engineering workflows.

---

## Section 1: Application Overview, Tech Stack, and File Map

**What the app is:** 
An AI-powered document transcription and translation portal built for the NGO "Children Believe." It allows regional operations teams to upload handwritten letters (from sponsored children in varying languages/scripts) and uses Google Gemini to generate highly literal, context-aware English translations formatted for PDF export to sponsors.

**Tech Stack:**
*   **Frontend:** React, TypeScript, Vite, Tailwind CSS
*   **Backend / Edge Logic:** Vercel Serverless Functions (`api/`)
*   **Database & Auth:** Supabase (PostgreSQL with Row-Level Security)
*   **AI Engine:** Google Gemini (Dynamic model routing)
*   **Export:** jsPDF + native browser File System Access API

**Key File Map:**
*   `components/TranslationView.tsx`: The core UI where image uploading, dual-pane translation comparison, and PDF generation occur.
*   `api/translate.ts`: The Vercel serverless proxy endpoint containing the critical model routing, AI prompt logic, and golden reference retrieval.
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

## Section 3: The 10 Outstanding Remediation Items

Only Medium and Informational items remain pending from the security review matrix (`REMEDIATION_PLAN.md`):

**Medium Priority:**
*   **M-1:** Apply `user.isAdmin` permission gate on the global Analytics dashboard.
*   **M-2:** Sever the Supabase client initialization from using string placeholder fallbacks so it fails loudly on configuration drift.
*   **M-3:** Fortify `generateWithRetry` in `translate.ts` to throw properly if the final attempt loop exhausts, mitigating undefined UI crashes.
*   **M-4:** Implement safer `try/catch` wrapping around the Gemini JSON truncation-recovery string appender.
*   **M-5:** Codify the missing `headerInfo` node directly within the `TranslationResult` TypeScript schema inside `types.ts`.

**Informational / Improvements:**
*   **I-1:** Inject strict Rate Limiting into `api/translate.ts` limits.
*   **I-2:** Setup Content Security Policy (CSP) headers protecting from XSS injections.
*   **I-3:** Transition Tailwind CSS off runtime CDN compilation towards a locally built Vite integration. 
*   **I-4:** Deprecate/purged unused `translateImage` leftovers inside `azureService.ts`.
*   **I-5:** Implement an automated model health check ping to ensure Google's preview models persist before routing traffic.

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

## Section 6: The 5 Critical Gotchas (Lessons Learned)

For anyone stepping into this codebase, observe the following landmines:

1.  **Google Model Deprecation:** Google routinely nukes experimental `-preview` variants of their models. Always ensure the API layer maintains a `try/catch` fallback switch that routes to the GA stable variant (`gemini-2.0-flash`) or the platform will abruptly crash.
2.  **The JavaScript Date Shift:** Calling `new Date("2026-04-10")` in North American timezones instantly mutates to `2026-04-09` under the hood because JS parses YYYY-MM-DD as strict UTC, then snaps it backward into negative local offsets. Always forcibly append UTC notation or map dates manually.
3.  **Analytics Sourcing:** Never tally metrics off of "Activity Event" tables. They inevitably get truncated or skipped. Deep aggregations must read pure materialized records coming from the `translations` baseline table. 
4.  **The Image Compression Dilemma:** Vercel functions have a hard 4.5MB request body size cap. However, if client-side Canvas compression limits are dialed down too sharply, foreign scripts (Tamil looping characters) lose pixel data and the OCR will hallucinate entirely incorrect meanings. Balance is critical.
5.  **Dynamic Golden References (Few-Shot):** The core intelligence of the app requires pulling "Golden" or Ground-Truth references from Supabase dynamically and injecting them into the Gemini generation prompt. LLMs natively struggle with literal dialect extraction without these specific few-shot anchors guiding them.
