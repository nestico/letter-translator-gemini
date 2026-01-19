# Deployment Plan & Cost Analysis: Letter Translator Gemini
## 1. Project Requirements & Usage Assumptions
User Base: ~20 active users (distributed across Africa, India, Central America).

Activity: ~10 letter uploads/day (total ~300 uploads/month).

Platform: Web-based (Mobile & Desktop).

Technical Needs:

Frontend: React (Vite) Single Page Application.

Backend/Auth: Supabase (PostgreSQL, Auth, Storage).

AI Processing: Google Gemini 2.0 Flash for multimodal image interpretation and synthesis.

## 2. System Architecture
### A. Technical Stack
AI Engine: Google Generative AI SDK (@google/generative-ai).

Model: gemini-2.0-flash (Paid Tier 1).

PDF Export: jsPDF using Legacy Save method to ensure filename integrity and branding consistency.

### B. Architecture Diagram
Code snippet

graph TD
    A[User Browser/Mobile] -->|Upload Images| B(React Frontend - Vite)
    B -->|Base64 Array| C[geminiService.ts]
    C -->|Single High-Fidelity Pass| D{Google Gemini API}
    D -->|JSON Response| C
    C -->|Translation & Metadata| B
    B -->|doc.save| E[Named PDF Export]
    B -->|Metadata| F[(Supabase DB)]
## 3. AI Processing Logic: "The Literal Scribe"
The system utilizes a Single High-Fidelity Pass strategy to ensure multi-page synthesis and cultural accuracy:

Multi-Page Synthesis: Combines up to 5 images into a single prompt to maintain narrative flow.

Cultural Anchors: Specific prompt engineering to detect regional nuances:

Telugu: Hunts for "Sankranti holidays" and family specific greetings.

Spanish: Identifies "Padrino/Madrina" relationships.

Persona Enforcement: Strictly enforced first-person translation to match the child's voice.

## 4. Stability & Rate Limit Management
To operate reliably on the Gemini Paid Tier 1, the following mitigations are active:

RPM Management: Hard limit of 10 Requests Per Minute (RPM).

Exponential Backoff: Automatic retry logic implemented in geminiService.ts to handle 429 Too Many Requests errors.

Batching: Multi-page letters are sent as a single request to conserve quota and ensure synthesis.

## 5. Cost Analysis Breakdown
### A. Gemini 2.0 Flash Costs (Estimated)
Gemini 2.0 Flash uses a token-based pricing model where images have a fixed token weight.

| Item | Token Count | Cost (Input: $0.10/1M | Output: $0.40/1M) | | :--- | :--- | :--- | | Per Image | 258 Tokens | ~$0.000025 | | Avg. Letter (2 pgs) | 516 Input Tokens | ~$0.000051 | | Translation Output | ~700 Tokens | ~$0.00028 | | Total per Letter | ~1,216 Tokens | ~$0.00033 |

Monthly Estimated Cost: For 300 uploads/month, the total AI cost is approximately $0.10 USD/month.

### B. Hosting & Storage
Frontend: Vercel/Netlify (Free Tier) - $0.00.

Database: Supabase (Free Tier) - $0.00.

Total Monthly Operational Cost: <$1.00 USD.

## 6. Deployment Workflow
Environment Setup:

VITE_GEMINI_API_KEY: Google AI Studio Key.

VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY: Connection to metadata store.

Build: npm run build (Vite production build).

CI/CD: Automatic deployment to production branch via GitHub Actions.