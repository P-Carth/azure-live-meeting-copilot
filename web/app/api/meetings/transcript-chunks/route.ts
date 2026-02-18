import { NextRequest, NextResponse } from "next/server";
import { TranscriptChunkSchema, applyMeetingDelta } from "@meeting-copilot/shared";
import { inferMeetingDelta } from "@/lib/inference";
import { createInitialState, getMeetingState, upsertMeetingState } from "@/lib/meetingStore";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parseResult = TranscriptChunkSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid chunk", details: parseResult.error.flatten() }, { status: 422 });
  }

  const chunk = parseResult.data;
  const current = (await getMeetingState(chunk.meetingId)) ?? createInitialState(chunk.meetingId);

  // Idempotent — skip already-processed sequences.
  if (current.processedSequences.includes(chunk.sequence)) {
    return NextResponse.json({ accepted: true, state: current });
  }

  const delta = await inferMeetingDelta(current, chunk);
  const updated = applyMeetingDelta(current, delta, chunk.sequence);
  await upsertMeetingState(updated);

  return NextResponse.json({ accepted: true, state: updated }, { status: 202 });
}
