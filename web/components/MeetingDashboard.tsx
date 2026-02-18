"use client";
import { FinalArtifactsPanel } from "./FinalArtifactsPanel";
import { MeetingStatePanel } from "./MeetingStatePanel";
import { TranscriptPanel } from "./TranscriptPanel";
import { useMeetingCopilot } from "@/hooks/useMeetingCopilot";

export function MeetingDashboard() {
  const {
    meetingId,
    isActive,
    transcript,
    meetingState,
    finalArtifacts,
    error,
    handleStartMeeting,
    handleEndMeeting
  } = useMeetingCopilot();

  return (
    <main className="container">
      <header className="hero">
        <h1>Live Meeting Copilot</h1>
        <p className="subtitle">
          Azure Speech &middot; Azure OpenAI &middot; Evidence-backed extraction &middot; Instant follow-up artifacts
        </p>
      </header>

      <section className="card controls">
        <button className="btn-primary" disabled={isActive} onClick={() => void handleStartMeeting()}>
          Start Meeting
        </button>
        <button className="btn-danger" disabled={!isActive} onClick={() => void handleEndMeeting()}>
          End Meeting
        </button>
        {meetingId && <span className="meeting-id">ID: {meetingId.slice(0, 8)}…</span>}
      </section>

      {error && <div className="card error-card">{error}</div>}

      <div className="two-col">
        <TranscriptPanel transcript={transcript} isActive={isActive} />
        <MeetingStatePanel state={meetingState} />
      </div>

      <FinalArtifactsPanel artifacts={finalArtifacts} />
    </main>
  );
}
