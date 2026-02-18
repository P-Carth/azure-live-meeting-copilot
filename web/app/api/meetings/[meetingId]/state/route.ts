import { NextRequest, NextResponse } from "next/server";
import { getMeetingState } from "@/lib/meetingStore";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const { meetingId } = await params;
  const state = await getMeetingState(meetingId);

  if (!state) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  return NextResponse.json(state);
}
