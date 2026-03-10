# AI Agent Prompt: Remediation Tasks (Medium Priority)

> **Instructions**: Copy everything below the line and paste it into your AI coding agent as a single prompt.

---

## CONTEXT

You are working on a production NGO application called "Letter Translator" for Children Believe. It translates handwritten sponsorship letters using Google Gemini AI. The project is a React (Vite) frontend deployed on Vercel with a serverless API handler at `api/translate.ts`. The backend is Supabase (PostgreSQL). A recent security audit scored the system 8.5/10 with 3 remaining medium-priority items that must be resolved. 

The project is located at: `c:\ANTIGRABITY\letter-translator-gemini`

## YOUR TASKS

You have **3 tasks** to complete. Do them sequentially. After each task, show me the diff of what changed and explain your reasoning. Commit each task separately.

---

### TASK 1: Implement Confidence Score Threshold Gate

**Problem**: The AI returns a `confidenceScore` (0.0 to 1.0) with every translation, but translations are auto-saved to the database regardless of quality. A score of 0.3 gets saved the same as a score of 0.95.

**Files to modify**:
- `api/translate.ts` — Add a `_flagged` property to low-confidence responses
- `components/TranslationView.tsx` — Display a warning banner when `_flagged` is true, and require explicit user approval before saving

**Requirements**:
1. In `api/translate.ts`, after the JSON is parsed (around line 215), add logic:
   - If `parsed.confidenceScore` exists AND is less than `0.7`, add two properties to the response: `_flagged: true` and `_flagReason: "Low confidence (X%). Please review carefully before saving."`
   - Do NOT block the response — still return 200, but with the flag attached
2. In `components/TranslationView.tsx`, in the `handleProcessConfirmed` function:
   - After receiving the result, check if `data._flagged === true`
   - If flagged: show a warning banner (amber/yellow background) with the `_flagReason` text and a "Confirm & Save Anyway" button
   - If flagged: do NOT auto-save to Supabase history (skip the `saveTranslation()` call)
   - If the user clicks "Confirm & Save Anyway", THEN save to history
   - If NOT flagged: keep current behavior (auto-save as normal)
3. The warning banner should use these Tailwind classes for consistency: `bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-4`
4. Add a Material Symbol icon `warning` before the message text

**Acceptance Criteria**:
- A translation with confidence 0.65 shows a yellow warning and does NOT auto-save
- A translation with confidence 0.85 behaves exactly as before (auto-save)
- The user can still manually approve and save a flagged translation

---

### TASK 2: Create Model Fallback Chain for Preview Model Stability

**Problem**: The current Smart Model Routing in `api/translate.ts` uses preview models (`gemini-3.1-pro-preview` and `gemini-3-flash-preview`) which can be deprecated without notice. If Google removes a preview model, ALL translations for that language group will fail with zero fallback.

**File to modify**:
- `api/translate.ts`

**Requirements**:
1. Define a model configuration object near the top of the handler (after the language rules):
```typescript
const MODEL_CONFIG = {
    complex: {
        primary: "gemini-3.1-pro-preview",
        fallback: "gemini-2.0-flash"
    },
    standard: {
        primary: "gemini-3-flash-preview",
        fallback: "gemini-2.0-flash"
    }
};
```
2. Replace the current single-attempt model instantiation with a try/catch fallback pattern:
   - First, try the primary model
   - If it fails with a `404`, `NOT_FOUND`, or model-unavailable error, log a warning and retry with the fallback model
   - If the fallback also fails, throw the error as normal
3. Add a `_modelUsed` property to the successful response JSON so the frontend can log which model was actually used (useful for debugging):
   ```typescript
   parsed._modelUsed = activeModelName; // e.g., "gemini-3.1-pro-preview" or "gemini-2.0-flash"
   ```
4. Keep the existing `generateWithRetry` logic intact — the fallback is for MODEL availability, not rate limits

**Acceptance Criteria**:
- If `gemini-3.1-pro-preview` returns 404, the system silently falls back to `gemini-2.0-flash` and still returns a valid translation
- The `_modelUsed` field in the response tells the frontend which model was actually used
- Normal operation (model available) is unchanged

---

### TASK 3: Document GCP Budget Cap Configuration

**Problem**: The deployment plan mentions a $20 budget cap on Google Cloud, but there's no documented procedure for setting this up, and no infrastructure-as-code proof it exists.

**File to create**:
- `docs/GCP_BUDGET_SETUP.md`

**Requirements**:
1. Create a step-by-step guide with screenshots descriptions for configuring a hard budget cap in Google Cloud Console
2. Include these sections:
   - **Prerequisites**: Google Cloud project with billing enabled
   - **Step 1**: Navigate to Billing → Budgets & Alerts
   - **Step 2**: Create Budget — Name it "Letter Translator - Gemini API Monthly Cap"
   - **Step 3**: Set Amount — Target: $50/month (allows headroom above the $20 estimate for peak usage)
   - **Step 4**: Set Thresholds — Alert at 50% ($25), 90% ($45), and 100% ($50)
   - **Step 5**: Configure Actions — Enable "Disable billing" at 100% to create a HARD cap (not just an alert)
   - **Step 6**: Set Notification Channels — Email to `nestico@childrenbelieve.ca` and `ehernandez@childrenbelieve.ca`
3. Add a **Verification Checklist** section at the bottom:
   ```
   - [ ] Budget created with name "Letter Translator - Gemini API Monthly Cap"
   - [ ] Hard cap set at $50/month
   - [ ] Alert thresholds at 50%, 90%, 100%
   - [ ] "Disable billing" action enabled at 100%
   - [ ] Notification emails configured
   - [ ] Test alert received
   ```
4. Add a **Monthly Review** note: "Check actual spend vs. projected ($0.76/month for 2,000 letters). If spend exceeds $5/month, investigate for anomalous usage patterns."

**Acceptance Criteria**:
- The guide is clear enough for a non-technical IT manager to follow
- The verification checklist can be used as a sign-off document
- The file is properly linked from `DEPLOYMENT_PLAN.md` (add a reference in the AI/Gemini deployment steps section)

---

## IMPORTANT CONSTRAINTS

- Do NOT modify any existing RLS policies or database schema
- Do NOT change the queue management logic in `queueService.ts`
- Do NOT change the prompt engineering in `api/translate.ts` (the `prompt` template string)
- Preserve all existing error handling patterns (top-level try-catch returning JSON)
- Use the existing Tailwind CSS classes and Material Symbols icon library for UI consistency
- Commit each task separately with descriptive commit messages
- Push all commits to `origin main` when complete

---
Task 1: Confidence Score Threshold Gate
Adds a _flagged: true property to any translation with confidence below 0.7
Modifies 

TranslationView.tsx
 to show an amber warning banner and block auto-save
User must explicitly click "Confirm & Save Anyway" to persist a low-confidence translation
Task 2: Model Fallback Chain
Defines a MODEL_CONFIG object with primary (gemini-3.1-pro-preview) and fallback (gemini-2.0-flash) models
If the primary model returns a 404/unavailable error, silently falls back to the stable model
Adds _modelUsed to the response for debugging
Task 3: GCP Budget Cap Documentation
Creates docs/GCP_BUDGET_SETUP.md with step-by-step instructions
Hard cap at $50/month with alerts at 50%, 90%, 100%
Includes a sign-off verification checklist for IT managers