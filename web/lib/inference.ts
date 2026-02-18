import {
  FinalMeetingArtifactsSchema,
  MeetingDeltaSchema,
  type FinalMeetingArtifacts,
  type MeetingDelta,
  type MeetingState,
  type TranscriptChunk
} from "@meeting-copilot/shared";
import { config } from "./config";
import { finalArtifactsPrompt, meetingDeltaPrompt } from "./prompts";

interface CompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

async function azureOpenAiComplete(
  prompt: string,
  deployment: string,
  useJsonFormat: boolean = true
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const baseUrl = config.openAi.endpoint.replace(/\/+$/, "");
  const url = `${baseUrl}/openai/deployments/${deployment}/chat/completions?api-version=${config.openAi.apiVersion}`;

  const body: Record<string, unknown> = {
    messages: [
      {
        role: "system",
        content: "You are a meeting intelligence assistant. Always respond with valid JSON only. No markdown, no explanation, no code fences."
      },
      { role: "user", content: prompt }
    ]
  };

  if (useJsonFormat) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": config.openAi.apiKey
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error(`[Azure OpenAI] ${response.status} from ${deployment}:`, errorBody);

    if (response.status === 400 && useJsonFormat) {
      console.log(`[Azure OpenAI] Retrying ${deployment} without response_format...`);
      return azureOpenAiComplete(prompt, deployment, false);
    }

    throw new Error(`Azure OpenAI error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as CompletionResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Azure OpenAI returned empty content");

  return {
    content,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0
  };
}

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

async function completeWithFallback(prompt: string): Promise<string> {
  try {
    const { content } = await azureOpenAiComplete(prompt, config.openAi.primaryDeployment);
    return extractJson(content);
  } catch (err) {
    console.error("[Azure OpenAI] Primary failed, trying fallback:", err);
    const { content } = await azureOpenAiComplete(prompt, config.openAi.fallbackDeployment);
    return extractJson(content);
  }
}

let _autoId = 0;
function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${++_autoId}`;
}

/**
 * Coerce the raw LLM JSON into the shape our Zod schemas expect.
 * Models like gpt-5-nano sometimes return plain strings where we need objects,
 * or omit required fields like id/confidence.
 */
function normalizeDelta(raw: Record<string, unknown>, chunk: TranscriptChunk): Record<string, unknown> {
  const now = new Date().toISOString();
  const asOptionalString = (value: unknown): string | undefined =>
    typeof value === "string" && value.trim() ? value : undefined;
  const asConfidence = (value: unknown, fallback: number): number =>
    typeof value === "number" && value >= 0 && value <= 1 ? value : fallback;

  const normalizeEvidence = () => ({
    quote: chunk.text.slice(0, 200),
    chunkId: chunk.chunkId,
    timestamp: chunk.sourceTs
  });

  const normalizeOpenQuestions = (arr: unknown[]): unknown[] =>
    arr.map((item) => {
      if (typeof item === "string") return { id: uid("q"), question: item };
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        return {
          ...obj,
          id: asOptionalString(obj.id) ?? uid("q"),
          question: asOptionalString(obj.question) ?? asOptionalString(obj.text) ?? String(item)
        };
      }
      return { id: uid("q"), question: String(item) };
    });

  const normalizeRisks = (arr: unknown[]): unknown[] =>
    arr.map((item) => {
      if (typeof item === "string") return { id: uid("r"), risk: item };
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        return {
          ...obj,
          id: asOptionalString(obj.id) ?? uid("r"),
          risk: asOptionalString(obj.risk) ?? asOptionalString(obj.description) ?? String(item),
          mitigation: asOptionalString(obj.mitigation)
        };
      }
      return { id: uid("r"), risk: String(item) };
    });

  const normalizeDecisions = (arr: unknown[]): unknown[] =>
    arr.map((item) => {
      if (typeof item === "string") {
        return { id: uid("d"), decision: item, evidence: normalizeEvidence(), confidence: 0.5 };
      }
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        return {
          ...obj,
          id: asOptionalString(obj.id) ?? uid("d"),
          decision: asOptionalString(obj.decision) ?? String(item),
          evidence: (obj.evidence && typeof obj.evidence === "object" ? obj.evidence : normalizeEvidence()),
          confidence: asConfidence(obj.confidence, 0.5)
        };
      }
      return { id: uid("d"), decision: String(item), evidence: normalizeEvidence(), confidence: 0.5 };
    });

  const normalizeActionItems = (arr: unknown[]): unknown[] =>
    arr.map((item) => {
      if (typeof item === "string") {
        return {
          id: uid("a"), owner: "Unassigned", task: item,
          evidence: normalizeEvidence(), confidence: 0.5
        };
      }
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        return {
          ...obj,
          id: asOptionalString(obj.id) ?? uid("a"),
          owner: asOptionalString(obj.owner) ?? "Unassigned",
          task: asOptionalString(obj.task) ?? asOptionalString(obj.description) ?? String(item),
          dueDate: asOptionalString(obj.dueDate),
          evidence: (obj.evidence && typeof obj.evidence === "object" ? obj.evidence : normalizeEvidence()),
          confidence: asConfidence(obj.confidence, 0.5)
        };
      }
      return {
        id: uid("a"), owner: "Unassigned", task: String(item),
        evidence: normalizeEvidence(), confidence: 0.5
      };
    });

  return {
    ...raw,
    generatedAt: raw.generatedAt ?? now,
    summaryIncrement: raw.summaryIncrement ?? raw.summary ?? "",
    decisions: Array.isArray(raw.decisions) ? normalizeDecisions(raw.decisions) : [],
    actionItems: Array.isArray(raw.actionItems) ? normalizeActionItems(raw.actionItems) : [],
    openQuestions: Array.isArray(raw.openQuestions) ? normalizeOpenQuestions(raw.openQuestions) : [],
    risks: Array.isArray(raw.risks) ? normalizeRisks(raw.risks) : [],
    agendaTopics: Array.isArray(raw.agendaTopics) ? raw.agendaTopics : [],
    participants: Array.isArray(raw.participants) ? raw.participants : []
  };
}

export async function inferMeetingDelta(state: MeetingState, chunk: TranscriptChunk): Promise<MeetingDelta> {
  if (!config.openAi.endpoint || !config.openAi.apiKey) {
    return MeetingDeltaSchema.parse({
      summaryIncrement: `[No Azure OpenAI configured] Transcript: "${chunk.text}"`,
      decisions: [],
      actionItems: [],
      openQuestions: [],
      risks: [],
      agendaTopics: [],
      participants: [],
      generatedAt: new Date().toISOString()
    });
  }

  const prompt = meetingDeltaPrompt(JSON.stringify(state), JSON.stringify(chunk));
  const raw = await completeWithFallback(prompt);
  const parsed = JSON.parse(raw);
  const normalized = normalizeDelta(parsed, chunk);
  const validated = MeetingDeltaSchema.safeParse(normalized);
  if (validated.success) return validated.data;

  // Never fail the ingestion pipeline on model shape issues.
  console.warn("[MeetingDelta] Validation failed, returning safe no-op delta:", validated.error.flatten());
  return MeetingDeltaSchema.parse({
    summaryIncrement: "",
    decisions: [],
    actionItems: [],
    openQuestions: [],
    risks: [],
    agendaTopics: [],
    participants: [],
    generatedAt: new Date().toISOString()
  });
}

export async function generateFinalArtifacts(state: MeetingState): Promise<FinalMeetingArtifacts> {
  if (!config.openAi.endpoint || !config.openAi.apiKey) {
    return FinalMeetingArtifactsSchema.parse({
      finalSummary: state.summarySoFar || "No summary available (Azure OpenAI not configured).",
      nextStepsChecklist: state.actionItems.map((a) => `${a.owner}: ${a.task}`),
      followUpEmail: {
        subject: "Meeting Follow-up",
        body: state.summarySoFar || "Please configure Azure OpenAI to generate a follow-up email."
      },
      slackMessage: undefined,
      markdownExport: `# Meeting Summary\n\n${state.summarySoFar}`,
      jiraExport: state.actionItems.map((a) => ({
        summary: a.task,
        description: a.evidence.quote,
        assignee: a.owner,
        dueDate: a.dueDate
      }))
    });
  }

  const prompt = finalArtifactsPrompt(JSON.stringify(state));
  const raw = await completeWithFallback(prompt);
  return FinalMeetingArtifactsSchema.parse(JSON.parse(raw));
}
