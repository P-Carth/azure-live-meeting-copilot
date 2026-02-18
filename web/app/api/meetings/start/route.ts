import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createInitialState, upsertMeetingState } from "@/lib/meetingStore";

export async function POST() {
  const meetingId = randomUUID();
  const state = createInitialState(meetingId);
  await upsertMeetingState(state);

  return NextResponse.json(
    { meetingId: state.meetingId, state, startedAt: state.lastUpdated },
    { status: 201 }
  );
}
