# MCP and custom tools enabled Personal Assistant

Final year project in compliance with BTech CSE @ JUIT.

Unlike traditional assistants that stop at answering questions, this system acts on user requests through real-world APIs—creating documents, scheduling events, generating podcasts, and supporting multi-step workflows.

## Features

- **Student Agent:** Create Google Docs, generate mind maps, and create multi-speaker podcasts from scripts.
- **Daily Life Agent:** Manage Google Calendar events and check real-time weather forecasts with proactive trip warnings.
- **Developer Agent:** Search Stack Overflow for technical solutions and provide formatted code snippets.
- **Mind Map Generator:** High-resolution Mermaid.js mind maps generated from natural language.
- **Podcast Tool:** Generate high-quality audio podcasts using Edge TTS (free, no billing required).
- **Secure Integration:** Full OAuth 2.0 flow for Google services.

## System Architecture

    User Query
         │
         ▼
    Gemini Pro 2.5 LLM  ───►  Decides (Think vs Act)
         │
         ▼
    Mastra Orchestrator
         │
         ├──► Google Docs & Drive Tool
         ├──► Google Calendar Tool
         ├──► Weather Forecasting Tool
         ├──► Stack Overflow Search Tool
         ├──► Podcast Generator (Edge TTS)
         └──► Mind Map Generator
         │
         ▼
    Final Response to User

## Tech Stack

**Core LLM:** Google Gemini Pro 2.5 (Flash)
**Agent Framework:** Mastra
**Cloud APIs:** Google Docs API, Google Drive API, Google Calendar API, OpenWeather API
**Memory:** SQLite (LibSQLStore in Mastra)
**Audio:** Edge TTS, Fluent-FFMPEG
**Visualization:** Mermaid.js

## Installation

### 1. Clone Repository
```bash
git clone https://github.com/meghnamankotia/PA-major.git
```

### 2. Install Dependencies
```bash
npm install mastra @google/generative-ai googleapis google-auth-library @libsql/client express dotenv cors node-edge-tts fluent-ffmpeg ffmpeg-static ffprobe-static
```

### 3. Configure Environment Variables
Create a `.env` file with your Google API credentials and other keys.

## Authors
- Meghna Mankotia
- Nikhilesh Sharma
- Shashvat
- Yuvraj Saini

Under the Supervision of Prof. Dr. Pradeep Kumar Gupta, Professor & Head, Department of CSE-IT JUIT.
