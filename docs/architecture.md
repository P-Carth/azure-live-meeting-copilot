# Architecture

## Stack: Next.js + Azure OpenAI

```
Browser Mic
    |
    v
Speech Recognition
    |  Azure Speech SDK (if keys provided)
    |  OR browser Web Speech API (free fallback)
    |
    v
Next.js API Routes (Vercel serverless functions)
    |
    +-- POST /api/meetings/start
    |     Creates meeting state (in-memory or Cosmos)
    |
    +-- POST /api/meetings/transcript-chunks
    |     Validates chunk -> calls Azure OpenAI -> returns MeetingDelta
    |     -> merges into MeetingState -> returns updated state
    |
    +-- GET /api/meetings/:id/stream (SSE)
    |     Polls state store, pushes updates to browser
    |
    +-- POST /api/meetings/:id/end
    |     Calls Azure OpenAI to generate final artifacts
    |
    v
React Dashboard
    +-- Live transcript (auto-scroll, recording indicator)
    +-- Incremental meeting intelligence (decisions, actions, questions, risks)
    +-- Timeline snapshots (every 60s)
    +-- Final artifacts (email, Slack, Markdown, Jira -- tabbed panel)
```

## Data Flow: Chunk -> State Update

```
TranscriptChunk (Zod-validated)
    |
    v
meetingDeltaPrompt(currentState, chunk)
    |
    v
Azure OpenAI (structured JSON output)
    |
    v
MeetingDelta (normalized + Zod-validated)
    |
    v
applyMeetingDelta(currentState, delta, sequence)
    |
    +-- merge decisions (deduplicate by normalized text, boost confidence)
    +-- merge action items (deduplicate by owner::task, boost confidence)
    +-- merge open questions (deduplicate by question text)
    +-- merge risks (deduplicate by risk text)
    +-- append timeline snapshot (if >= 60s since last)
    +-- mark sequence as processed (idempotency)
    |
    v
Updated MeetingState -> store -> SSE to browser
```

## Model Strategy

```
FallbackRouter
    |
    +-- Primary: MODEL_PRIMARY_DEPLOYMENT (e.g., gpt-5-nano)
    |       try first
    |
    +-- Fallback: MODEL_FALLBACK_DEPLOYMENT (e.g., gpt-4.1-mini)
            used if primary fails
```

## State Persistence

| Mode | Config | Best For |
|------|--------|----------|
| **In-memory** (default) | No config needed | Local dev |
| **Cosmos DB serverless** | Set `COSMOS_ENDPOINT` + `COSMOS_KEY` | Vercel deployment |
