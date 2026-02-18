"use client";
import { useEffect, useRef } from "react";

interface TranscriptLine {
  id: string;
  text: string;
  timestamp: string;
}

interface Props {
  transcript: TranscriptLine[];
  isActive: boolean;
}

export function TranscriptPanel({ transcript, isActive }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript.length]);

  return (
    <section className="card transcript-panel">
      <h3>
        Live Transcript
        {isActive && <span className="recording-dot" />}
      </h3>
      <div className="transcript-scroll">
        {transcript.length === 0 && (
          <p className="empty-hint">
            {isActive ? "Listening…" : "Start a meeting to see the transcript."}
          </p>
        )}
        {transcript.map((line) => (
          <div key={line.id} className="transcript-line">
            <span className="ts">{new Date(line.timestamp).toLocaleTimeString()}</span>
            <span>{line.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </section>
  );
}
