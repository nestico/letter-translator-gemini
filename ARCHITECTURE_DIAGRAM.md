# Letter Translator Infrastructure & Flow Diagram

The following is a Mermaid diagram that outlines the architectural infrastructure and data flow for the Letter Translator application. You can copy and paste this into any Mermaid-compatible viewer (like GitHub, Notion, or the Mermaid Live Editor) to generate the diagram.

## Architectural Flow

```mermaid
graph TD
    %% Define Styles
    classDef frontend fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff;
    classDef api fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:#fff;
    classDef external fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff;
    classDef db fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff;

    %% Client Layer (Frontend)
    subgraph Client ["Client (React / Vite)"]
        UI["User Interface (TranslationView)"]:::frontend
        History["History Tab"]:::frontend
        PDFGen["PDF Exporter (jsPDF)"]:::frontend
    end

    %% Backend Layer (Serverless API)
    subgraph Serverless ["Backend (API Routes)"]
        TranslateAPI["api/translate.ts"]:::api
        ModelRouter{"Model Router<br/>(Pro vs Flash)"}:::api
    end

    %% External Services Layer
    subgraph ThirdParty ["External Services"]
        Gemini{"Google Gemini AI"}:::external
        Supabase[(Supabase<br/>PostgreSQL & Auth)]:::db
    end

    %% Flow Steps
    UI -- "1. Uploads Image(s) + Settings" --> TranslateAPI
    
    TranslateAPI -- "2. Checks Language Complexity" --> ModelRouter
    ModelRouter -. "Complex (Amharic/Tamil)" .-> Gemini
    ModelRouter -. "Standard (Spanish/French)" .-> Gemini
    
    TranslateAPI -- "3. Fetches Golden Examples" --> Supabase
    
    Gemini -- "4. Returns JSON (Translation, Confidence, Header Info)" --> TranslateAPI
    TranslateAPI -- "5. Returns Payload" --> UI
    
    UI -- "6. User Reviews & Edits Result" --> UI
    
    UI -- "7a. 'Approve & Save'" --> Supabase
    History -- "Fetches Records" --> Supabase
    
    UI -- "7b. 'Export PDF'" --> PDFGen
```

### Flow Breakdown:
1. **Upload**: User uploads images and specifies target/source languages via the UI.
2. **Routing**: The `api/translate.ts` backend receives the request and dynamically routes it to either `gemini-3.1-pro-preview` (for complex languages) or `gemini-3-flash-preview` (for standard languages).
3. **Reference Fetching**: The API silently fetches "Golden References" from Supabase to provide formatting examples to the AI prompt.
4. **AI Processing**: Gemini processes the images using the combined static + dynamic instructions.
5. **Review**: The JSON payload (Data, Header, Confidence Score) returns to the UI for user review.
6. **Persistence**: Upon approval, the data (including parsed header info like Child Name and ID) is persisted to the Supabase Postgres database.
7. **Export**: The frontend securely compiles all data client-side into a formatted PDF using the local user's browser (no external PDF rendering service required).
