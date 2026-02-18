import { randomUUID } from "node:crypto";
import type { ActionItem, Decision, MeetingDelta, MeetingState, OpenQuestion, Risk } from "./types.js";

const normalize = (value: string): string => value.trim().toLowerCase();

function mergeByKey<T extends { id: string }>(
  current: T[],
  incoming: T[],
  keyFn: (item: T) => string,
  confidenceResolver?: (existing: T, next: T) => T
): T[] {
  const map = new Map(current.map((item) => [keyFn(item), item]));

  for (const next of incoming) {
    const key = keyFn(next);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...next, id: next.id || randomUUID() });
      continue;
    }

    if (confidenceResolver) {
      map.set(key, confidenceResolver(existing, next));
      continue;
    }

    map.set(key, { ...existing, ...next });
  }

  return [...map.values()];
}

function mergeDecisions(existing: Decision[], incoming: Decision[]): Decision[] {
  return mergeByKey(existing, incoming, (item) => normalize(item.decision), (oldItem, newItem) => ({
    ...oldItem,
    ...newItem,
    confidence: Math.max(oldItem.confidence, newItem.confidence)
  }));
}

function mergeActionItems(existing: ActionItem[], incoming: ActionItem[]): ActionItem[] {
  return mergeByKey(
    existing,
    incoming,
    (item) => `${normalize(item.owner)}::${normalize(item.task)}`,
    (oldItem, newItem) => ({
      ...oldItem,
      ...newItem,
      confidence: Math.max(oldItem.confidence, newItem.confidence)
    })
  );
}

function mergeOpenQuestions(existing: OpenQuestion[], incoming: OpenQuestion[]): OpenQuestion[] {
  return mergeByKey(existing, incoming, (item) => normalize(item.question));
}

function mergeRisks(existing: Risk[], incoming: Risk[]): Risk[] {
  return mergeByKey(existing, incoming, (item) => normalize(item.risk));
}

export function applyMeetingDelta(state: MeetingState, delta: MeetingDelta, processedSequence: number): MeetingState {
  const summaryParts = [state.summarySoFar, delta.summaryIncrement].map((s) => s.trim()).filter(Boolean);
  const latestSnapshot = state.snapshots[state.snapshots.length - 1];
  const shouldSnapshot =
    !latestSnapshot ||
    Math.abs(Date.parse(delta.generatedAt) - Date.parse(latestSnapshot.timestamp)) >= 60_000;
  const snapshots = shouldSnapshot
    ? [...state.snapshots, { timestamp: delta.generatedAt, summary: summaryParts.join("\n\n").slice(0, 1200) }]
    : state.snapshots;

  return {
    ...state,
    summarySoFar: summaryParts.join("\n\n"),
    decisions: mergeDecisions(state.decisions, delta.decisions),
    actionItems: mergeActionItems(state.actionItems, delta.actionItems),
    openQuestions: mergeOpenQuestions(state.openQuestions, delta.openQuestions),
    risks: mergeRisks(state.risks, delta.risks),
    agendaTopics: [...new Set([...state.agendaTopics, ...delta.agendaTopics])],
    participants: [...new Set([...state.participants, ...delta.participants])],
    snapshots,
    processedSequences: [...new Set([...state.processedSequences, processedSequence])].sort((a, b) => a - b),
    lastUpdated: delta.generatedAt
  };
}
