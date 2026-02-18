# 60-Second Demo Script

## Setup

1. `npm run dev` in repo root (starts Next.js on :3000)
2. Open `http://localhost:3000` in Chrome or Edge
3. Ensure `web/.env.local` has your Azure OpenAI keys

## Script

### 0:00 -- Intro (5s)

> "This is a real-time meeting copilot. It transcribes live audio and incrementally extracts decisions, action items, and risks -- each linked to the exact quote that produced it."

### 0:05 -- Start meeting (5s)

Click **Start Meeting**. Red recording dot appears.

### 0:10 -- Speak naturally (30s)

> "Alright, let's kick off. Alice, you'll own the API integration -- let's target next Friday. We've decided to go with Cosmos DB for persistence. Bob, can you look into the Event Hubs throughput limits? I'm a bit worried about cost overruns if we hit production traffic spikes."

Watch the dashboard populate live:
- **Summary** updates incrementally
- **Action item**: Alice / API integration / next Friday
- **Decision**: Use Cosmos DB
- **Open question**: Event Hubs throughput limits
- **Risk**: Cost overruns

### 0:40 -- Highlight evidence (8s)

> "Notice each extraction includes the evidence quote and a confidence score. No hallucinated action items."

### 0:48 -- End meeting (7s)

Click **End Meeting**. Show tabbed artifacts:
- Summary tab
- Follow-up email (ready to copy)
- Jira export table

### 0:55 -- Architecture (5s)

> "Powered by Azure OpenAI GPT-5 nano with a deterministic merge engine, deployed on Vercel with Cosmos DB persistence. Infrastructure is defined in Bicep IaC."

## Key Talking Points

- **Incremental, not batch**: state updated per-chunk, never re-summarized.
- **Evidence-backed**: every extraction cites its source.
- **Cost-efficient**: runs on Vercel + Azure OpenAI pay-per-token.
- **Azure-native**: Speech SDK, OpenAI, Cosmos DB, Bicep IaC.
