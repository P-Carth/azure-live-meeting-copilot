import { NextRequest, NextResponse } from "next/server";
import { generateFinalArtifacts } from "@/lib/inference";
import { getMeetingState } from "@/lib/meetingStore";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const { meetingId } = await params;
  const state = await getMeetingState(meetingId);

  if (!state) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const artifacts = await generateFinalArtifacts(state);
  return NextResponse.json(artifacts);
}
