"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FinalMeetingArtifacts, MeetingState } from "@meeting-copilot/shared";
import { useSpeech } from "./useSpeech";

interface TranscriptLine {
  id: string;
  text: string;
  timestamp: string;
}

function buildChunk(meetingId: string, sequence: number, text: string) {
  const now = new Date().toISOString();
  return {
    meetingId,
    chunkId: `${meetingId}-${sequence}`,
    sourceTs: now,
    receivedTs: now,
    text,
    sequence,
    language: "en-US"
  };
}

export function useMeetingCopilot() {
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [meetingState, setMeetingState] = useState<MeetingState | null>(null);
  const [finalArtifacts, setFinalArtifacts] = useState<FinalMeetingArtifacts | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sequenceRef = useRef(0);
  const meetingIdRef = useRef<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const stopSSE = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  }, []);

  const startSSE = useCallback(
    (id: string) => {
      stopSSE();
      const es = new EventSource(`/api/meetings/${id}/stream`);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "state_update" && data.state) {
            setMeetingState(data.state);
          }
        } catch {
          // Ignore malformed frames.
        }
      };
    },
    [stopSSE]
  );

  const emitChunk = useCallback(async (text: string) => {
    const id = meetingIdRef.current;
    if (!id || !text.trim()) return;

    const seq = sequenceRef.current++;
    const chunk = buildChunk(id, seq, text.trim());

    setTranscript((prev) => [
      ...prev,
      { id: chunk.chunkId, text: chunk.text, timestamp: chunk.sourceTs }
    ]);

    try {
      const res = await fetch("/api/meetings/transcript-chunks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chunk)
      });

      if (res.ok) {
        const data = await res.json();
        // Inline processing returns updated state immediately — use it if SSE hasn't fired yet.
        if (data.state) setMeetingState(data.state);
      }
    } catch {
      // Non-fatal — next chunk will still work.
    }
  }, []);

  const { start: startSpeech, stop: stopSpeech } = useSpeech(
    (text) => void emitChunk(text),
    (msg) => setError(msg)
  );

  const handleStartMeeting = useCallback(async () => {
    try {
      setError(null);
      setFinalArtifacts(null);
      setTranscript([]);
      sequenceRef.current = 0;

      const res = await fetch("/api/meetings/start", { method: "POST" });
      if (!res.ok) throw new Error("Failed to start meeting");

      const session = await res.json();
      setMeetingId(session.meetingId);
      meetingIdRef.current = session.meetingId;
      setMeetingState(session.state);

      startSSE(session.meetingId);
      await startSpeech();
      setIsActive(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start meeting");
    }
  }, [startSpeech, startSSE]);

  const handleEndMeeting = useCallback(async () => {
    const id = meetingIdRef.current;
    if (!id) return;

    stopSpeech();
    stopSSE();
    setIsActive(false);

    try {
      const res = await fetch(`/api/meetings/${id}/end`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate artifacts");
      const artifacts = await res.json();
      setFinalArtifacts(artifacts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end meeting");
    }
  }, [stopSpeech, stopSSE]);

  useEffect(() => {
    return () => {
      stopSSE();
      stopSpeech();
    };
  }, [stopSSE, stopSpeech]);

  return {
    meetingId,
    isActive,
    transcript,
    meetingState,
    finalArtifacts,
    error,
    handleStartMeeting,
    handleEndMeeting
  };
}
