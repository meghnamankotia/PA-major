
# MCP and custom tools enables Personal Assitant


Final year project in compliance with BTech CSE @ JUIT.

Unlike traditional assistants that stop at answering questions, this system acts on user requests through real-world APIs—creating documents, editing files, generating mind-maps, summarizing PDFs, and supporting multi-step workflows.




## Features

-   Create Google Docs through natural-language commands
-   Insert/edit text using Docs API
-   Secure OAuth 2.0 integration
-   Gemini Pro 2.5 performs reasoning and tool routing
-   Mastra handles structured tool invocation
-   Mind Map Generator (high-resolution PNGs)

## System Architecture

    User Query
         │
         ▼
    Gemini Pro 2.5 LLM  ───►  Decides (Think vs Act)
         │
         ▼
    Mastra Orchestrator
         │
         ├──► Google Docs Tool
         ├──► Google Drive Tool
         ├──► Mind Map Generator
         └──► Vector Query Tool
         │
         ▼
    Final Response to User

## Tech Stack

**Core LLM :** Google Gemini Pro 2.5 (Flash)

**Agent Framework:** Mastra

**Cloud APIs:** Google Docs API, Google Drive API

**Memory:** SQLite (LibSQLStore in Mastra)

**Other libraries:** Mermaid.js

## Installation
### 1. Clone Repository

``` bash
git clone https://github.com/meghnamankotia/PA-major.git
```

### 2. Install Dependencies

``` bash

npm install \
  mastra \
  @google/generative-ai \
  googleapis \
  google-auth-library \
  @libsql/client \
  express \
  dotenv \
  cors

```

### 3. Configure Environment Variables

Create a `.env` file:

    GOOGLE_CLIENT_ID=<your-client-id>
    GOOGLE_CLIENT_SECRET=<your-secret>
    GOOGLE_REDIRECT_URI=<redirect-uri>
    GOOGLE_TOKEN_PATH=<path>
    GOOGLE_APPLICATION_CREDENTIALS=<credentials>
    DATABASE_AUTH_TOKEN=<auth-token>
    DATABASE_URL=<db-url>
    GOOGLE_API_KEY=<your-api-key>
    GOOGLE_GENERATIVE_AI_API_KEY=<usually-same-as-above>

### 4. Start Development Server

``` bash
npm run dev
```

## Authors

- Meghna Mankotia
- Nikhilesh Sharma
- Shashvat
- Yuvraj Saini

Under the Supervision of Prof. Dr. Pradeep Kumar Gupta, Professor, Department of CSE-IT JUIT.


