import { NextRequest } from "next/server";
import { getMeetingState } from "@/lib/meetingStore";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const { meetingId } = await params;
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: "connected", meetingId });

      let lastUpdated: string | null = null;

      while (!closed) {
        await new Promise((r) => setTimeout(r, 2500));
        if (closed) break;

        try {
          const state = await getMeetingState(meetingId);
          if (state && state.lastUpdated !== lastUpdated) {
            lastUpdated = state.lastUpdated;
            send({ type: "state_update", state });
          }
        } catch {
          // Ignore transient read errors to keep SSE alive.
        }
      }
    },
    cancel() {
      closed = true;
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
