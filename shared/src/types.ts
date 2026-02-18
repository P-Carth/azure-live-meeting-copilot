import { z } from "zod";

export const TranscriptChunkSchema = z.object({
  meetingId: z.string().min(1),
  chunkId: z.string().min(1),
  sourceTs: z.string().datetime(),
  receivedTs: z.string().datetime(),
  speakerId: z.string().optional(),
  speakerLabel: z.string().optional(),
  text: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
  language: z.string().default("en-US"),
  sequence: z.number().int().nonnegative()
});

export const EvidenceSchema = z.object({
  quote: z.string().min(1),
  chunkId: z.string().min(1),
  timestamp: z.string().datetime()
});

export const DecisionSchema = z.object({
  id: z.string().min(1),
  decision: z.string().min(1),
  evidence: EvidenceSchema,
  confidence: z.number().min(0).max(1).default(0.5)
});

export const ActionItemSchema = z.object({
  id: z.string().min(1),
  owner: z.string().min(1),
  task: z.string().min(1),
  dueDate: z.string().optional(),
  evidence: EvidenceSchema,
  confidence: z.number().min(0).max(1)
});

export const OpenQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  evidence: EvidenceSchema.optional()
});

export const RiskSchema = z.object({
  id: z.string().min(1),
  risk: z.string().min(1),
  mitigation: z.string().optional(),
  evidence: EvidenceSchema.optional()
});

export const TimelineSnapshotSchema = z.object({
  timestamp: z.string().datetime(),
  summary: z.string().min(1)
});

export const MeetingStateSchema = z.object({
  meetingId: z.string().min(1),
  summarySoFar: z.string().default(""),
  decisions: z.array(DecisionSchema).default([]),
  actionItems: z.array(ActionItemSchema).default([]),
  openQuestions: z.array(OpenQuestionSchema).default([]),
  risks: z.array(RiskSchema).default([]),
  agendaTopics: z.array(z.string()).default([]),
  participants: z.array(z.string()).default([]),
  snapshots: z.array(TimelineSnapshotSchema).default([]),
  lastUpdated: z.string().datetime(),
  processedSequences: z.array(z.number().int().nonnegative()).default([])
});

export const MeetingDeltaSchema = z.object({
  summaryIncrement: z.string().default(""),
  decisions: z.array(DecisionSchema).default([]),
  actionItems: z.array(ActionItemSchema).default([]),
  openQuestions: z.array(OpenQuestionSchema).default([]),
  risks: z.array(RiskSchema).default([]),
  agendaTopics: z.array(z.string()).default([]),
  participants: z.array(z.string()).default([]),
  generatedAt: z.string().datetime()
});

export const FinalMeetingArtifactsSchema = z.object({
  finalSummary: z.string().min(1),
  nextStepsChecklist: z.array(z.string()).default([]),
  followUpEmail: z.object({
    subject: z.string().min(1),
    body: z.string().min(1)
  }),
  slackMessage: z.string().optional(),
  markdownExport: z.string().min(1),
  jiraExport: z.array(
    z.object({
      summary: z.string().min(1),
      description: z.string().min(1),
      assignee: z.string().optional(),
      dueDate: z.string().optional()
    })
  )
});

export type TranscriptChunk = z.infer<typeof TranscriptChunkSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type Decision = z.infer<typeof DecisionSchema>;
export type ActionItem = z.infer<typeof ActionItemSchema>;
export type OpenQuestion = z.infer<typeof OpenQuestionSchema>;
export type Risk = z.infer<typeof RiskSchema>;
export type TimelineSnapshot = z.infer<typeof TimelineSnapshotSchema>;
export type MeetingState = z.infer<typeof MeetingStateSchema>;
export type MeetingDelta = z.infer<typeof MeetingDeltaSchema>;
export type FinalMeetingArtifacts = z.infer<typeof FinalMeetingArtifactsSchema>;
