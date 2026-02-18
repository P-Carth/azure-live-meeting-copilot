# Azure Live Meeting Copilot

A real-time meeting intelligence platform. While you speak, the system continuously extracts **decisions**, **action items**, **open questions**, and **risks** -- each backed by the exact transcript snippet that triggered it. When the meeting ends, it produces a ready-to-send follow-up email, Markdown summary, Slack draft, and Jira-formatted action items.

---

## Architecture

```
Browser Mic
    |
    v
Speech Recognition
(Azure Speech SDK or browser Web Speech API -- free fallback)
    |
    v
Next.js API Routes (Vercel serverless)
    |
    +---> Azure OpenAI (GPT-5 nano / GPT-4.1-mini)
    |         |
    |         v
    |     MeetingDelta (structured JSON)
    |         |
    |         v
    |     Deterministic merge engine
    |
    v
Meeting State (in-memory or Cosmos DB serverless)
    |
    v
React Dashboard (SSE live updates)
    +-- Live transcript
    +-- Running summary
    +-- Decisions (with evidence)
    +-- Action items (owner, task, due, evidence, confidence)
    +-- Open questions & risks
    +-- Timeline snapshots (every 60s)
```

### Azure Services Used

| Service | Purpose | Cost |
|---------|---------|------|
| **Azure OpenAI** | Structured extraction via GPT-5 nano (or GPT-4.1-mini) | Pay-per-token only |
| **Azure Speech** (optional) | Streaming speech-to-text | Free tier available; optional |
| **Cosmos DB** (optional) | Serverless state persistence for deployed apps | Pay-per-request; optional |

---

## Key Design Decisions

### Incremental Intelligence (not re-summarize)

Each transcript chunk produces a `MeetingDelta` that is **merged** into the canonical `MeetingState` using deterministic rules:

- **Deduplication** by normalized content keys
- **Evidence preservation** -- no action item or decision without a verbatim quote
- **Confidence boosting** -- repeated evidence raises the score

### Model Router with Fallback

Primary deployment (configurable) with automatic fallback to a secondary deployment. Supports BYO/custom model endpoints.

### Dual-Mode State Store

- **In-memory** (default, zero config, free)
- **Cosmos DB serverless** (opt-in, multi-instance safe for Vercel deployment)

---

## Repository Structure

```
web/              Next.js app (UI + API routes), deploy to Vercel
  app/            App Router pages + API routes
  components/     React components (transcript, state, artifacts panels)
  hooks/          useMeetingCopilot, useSpeech
  lib/            inference, prompts, config, meetingStore
shared/           Zod schemas + deterministic merge engine
infra/bicep/      IaC: minimal.bicep (Azure OpenAI + Speech)
docs/             Architecture docs + demo script
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- An Azure subscription (free tier works)

### 1. Install

```bash
npm install
npm run build -w shared
```

### 2. Configure

```bash
cp web/.env.local.example web/.env.local
```

Set these values in `web/.env.local`:

```
AZURE_OPENAI_ENDPOINT=https://<your-resource>.cognitiveservices.azure.com
AZURE_OPENAI_API_KEY=<key>
MODEL_PRIMARY_DEPLOYMENT=gpt-5-nano
```

### 3. Run

```bash
npm run dev
```

Open `http://localhost:3000`, click **Start Meeting**, speak, then **End Meeting**.

### Without any Azure keys

The app still works: it uses browser speech recognition (Chrome/Edge) and returns transcript-only summaries without LLM extraction.

---

## Deploy

### Frontend + API (Vercel)

1. Push repo to GitHub
2. Import in Vercel, set **Root Directory** to `web`
3. Add environment variables (see below)

| Variable | Value |
|----------|-------|
| `AZURE_OPENAI_ENDPOINT` | Your Azure OpenAI endpoint |
| `AZURE_OPENAI_API_KEY` | Your Azure OpenAI key |
| `AZURE_OPENAI_API_VERSION` | `2025-01-01-preview` |
| `MODEL_PRIMARY_DEPLOYMENT` | `gpt-5-nano` |
| `MODEL_FALLBACK_DEPLOYMENT` | `gpt-5-nano` |
| `COSMOS_ENDPOINT` | Cosmos DB URI (recommended for deployed demo) |
| `COSMOS_KEY` | Cosmos DB primary key |
| `COSMOS_DATABASE` | `meeting-copilot` |
| `COSMOS_CONTAINER` | `meeting-state` |
| `NEXT_PUBLIC_AZURE_SPEECH_REGION` | `eastus2` |
| `NEXT_PUBLIC_AZURE_SPEECH_KEY` | Your Azure Speech key |

### Azure Resources (Bicep IaC)

```bash
az group create -n rg-meeting-copilot -l eastus2

az deployment group create \
  -g rg-meeting-copilot \
  -f infra/bicep/minimal.bicep \
  -p baseName=meetingcopilot
```

Then deploy a model in Azure AI Foundry (e.g., `gpt-5-nano`).

### Cost Estimate

| Resource | Monthly Cost |
|----------|-------------|
| Azure OpenAI (GPT-5 nano, light demo use) | ~$0.50-2.00 |
| Azure Speech (free tier, 5hrs/month) | $0.00 |
| Cosmos DB serverless (demo use) | ~$0.00-0.50 |
| Vercel (Pro plan) | Included |
| **Total** | **< $3/month for demos** |

---

## Data Contract

The core `MeetingState` object:

```json
{
  "meetingId": "uuid",
  "summarySoFar": "...",
  "decisions": [{ "id": "...", "decision": "...", "evidence": { "quote": "...", "chunkId": "...", "timestamp": "..." }, "confidence": 0.92 }],
  "actionItems": [{ "id": "...", "owner": "Alice", "task": "...", "dueDate": "2026-02-28", "evidence": {...}, "confidence": 0.85 }],
  "openQuestions": [{ "id": "...", "question": "..." }],
  "risks": [{ "id": "...", "risk": "...", "mitigation": "..." }],
  "snapshots": [{ "timestamp": "...", "summary": "..." }],
  "participants": ["Alice", "Bob"],
  "lastUpdated": "2026-02-17T..."
}
```

---

## Resume Bullet

> Built a real-time meeting copilot using Azure OpenAI (GPT-5 nano) for incremental extraction of decisions and action items with evidence, deployed on Vercel with Next.js API routes, Zod-validated schemas, a deterministic merge engine, and Azure IaC (Bicep).
