
# Deployment Plan: Letter Translator App

## 1. Architecture Overview

The application follows a modern serverless architecture, reducing the need for traditional server maintenance.

### **Tech Stack**
- **Frontend**: React (Vite) + TypeScript + TailwindCSS
- **Backend/Auth**: Supabase (PostgreSQL + Auth + Storage)
- **AI Engine**: Azure OpenAI Service (GPT-4o)
- **Hosting**: Static Web Hosting (Vercel, Netlify, or Azure Static Web Apps)

### **Flow Diagram**
```mermaid
graph TD
    User((User)) -->|HTTPS| CDN[Content Delivery Network]
    CDN -->|Load| Frontend[React App\n(Vercel/Netlify)]
    
    Frontend -->|Auth/Data| Supabase[Supabase\n(Auth, DB, Storage)]
    
    Frontend -->|API Call| Proxy[Azure OpenAI Proxy]
    Proxy -->|Translate| AzureAI[Azure OpenAI\n(GPT-4o)]
    
    subgraph "Data Flow"
        Supabase -->|Store| DB[(PostgreSQL)]
        Supabase -->|Store| Storage[(File Storage)]
    end
```

---

## 2. Deployment Procedures

### **Step 1: Code Preparation**
1.  **Commit Code**: Ensure all changes are committed to a Git repository (GitHub/GitLab).
2.  **Environment Variables**: Gather your keys (Do NOT commit `.env`).
    - `VITE_SUPABASE_URL`
    - `VITE_SUPABASE_ANON_KEY`
    - `VITE_AZURE_OPENAI_ENDPOINT`
    - `VITE_AZURE_OPENAI_API_KEY`
    - `VITE_AZURE_OPENAI_DEPLOYMENT`

### **Step 2: Deployment Platform (Recommended: Vercel)**
*Vercel is recommended for its seamless React/Vite support and "zero-config" setup.*

1.  **Connect**: Go to [vercel.com](https://vercel.com), sign up, and "Add New Project".
2.  **Import**: Select your GitHub repository.
3.  **Configure**:
    - **Framework Preset**: Vite
    - **Root Directory**: `.` (default)
    - **Build Command**: `npm run build`
    - **Output Directory**: `dist`
4.  **Environment Variables**:
    - Copy-paste key-value pairs from your local `.env`.
5.  **Deploy**: Click "Deploy". Vercel will build and assign a URL (e.g., `letter-translator.vercel.app`).

### **Step 3: Database & Auth (Supabase)**
1.  **Site URL**: In Supabase Dashboard -> Authentication -> URL Configuration.
    - Set **Site URL** to your new Vercel production URL.
    - Add it to **Redirect URLs**.
2.  **CORS**: Ensure Supabase Storage buckets allow requests from your production domain if restricted.

---

## 3. Cost Comparison

### **Frontend Hosting**
For a low-traffic application (personal/portfolio use), the **Free Tiers** are usually sufficient.

| Feature | **Vercel** (Recommended) | **Netlify** | **Azure Static Web Apps** |
| :--- | :--- | :--- | :--- |
| **Free Tier** | **Generous**: 100GB bandwidth, excellent globally distributed CDN. | **Good**: 100GB bandwidth, easy setup. | **Moderate**: 100GB bandwidth, slightly more complex Azure integration. |
| **Pro Cost** | $20/month per user | $19/month per user | ~$9/month (Standard Plan) |
| **Pros** | Fastest for React/Next.js, zero-config. | Great Edge Functions, simple UI. | Unified billing if using other Azure services. |
| **Cons** | Free tier for non-commercial only. | Bandwidth hard limits on free tier. | Slower deployment cold starts on free tier. |

### **Backend & AI Services**
These costs depend on usage.

| Service | **Supabase** | **Azure OpenAI (GPT-4o)** |
| :--- | :--- | :--- |
| **Free Tier** | **Yes**. Up to 500MB DB, 50k MAU, 1GB file storage. Perfect for this app. | **No**. Pay-as-you-go model. |
| **Pro Cost** | $25/month (if you exceed free limits). | **~$2.50 - $15.00** per 1M tokens (depends on input/output mix). |
| **Est. Monthly** | **$0** (Free Tier is sufficient). | **~$5 - $20** (assuming moderate translation usage). |

***

## 4. Final Recommendation

1.  **Host Frontend on Vercel**: Fastest setup, free for personal use, high performance.
2.  **Keep Backend on Supabase Free Tier**: It offers more than enough capacity for thousands of translations.
3.  **Monitor Azure OpenAI**: Set a **Budget Alert** in Azure to cap spending (e.g., at $50/month) to prevent unexpected bills.
