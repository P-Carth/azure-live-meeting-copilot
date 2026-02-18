"use client";
import type { MeetingState } from "@meeting-copilot/shared";

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const cls = pct >= 80 ? "badge high" : pct >= 50 ? "badge mid" : "badge low";
  return <span className={cls}>{pct}%</span>;
}

function EmptyHint({ label }: { label: string }) {
  return <p className="empty-hint">No {label} detected yet.</p>;
}

export function MeetingStatePanel({ state }: { state: MeetingState | null }) {
  if (!state) return <div className="card muted">Waiting for meeting to begin…</div>;

  return (
    <div className="state-grid">
      <section className="card span-full">
        <h3>Summary So Far</h3>
        <p className="summary-text">{state.summarySoFar || "Listening…"}</p>
      </section>

      {state.participants.length > 0 && (
        <section className="card span-full chip-row">
          {state.participants.map((p) => (
            <span key={p} className="chip">{p}</span>
          ))}
        </section>
      )}

      <section className="card">
        <h3>Decisions</h3>
        {state.decisions.length === 0 ? (
          <EmptyHint label="decisions" />
        ) : (
          <ul>
            {state.decisions.map((d) => (
              <li key={d.id}>
                <div className="item-header">
                  <strong>{d.decision}</strong>
                  <ConfidenceBadge value={d.confidence} />
                </div>
                <blockquote className="evidence">&ldquo;{d.evidence.quote}&rdquo;</blockquote>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h3>Action Items</h3>
        {state.actionItems.length === 0 ? (
          <EmptyHint label="action items" />
        ) : (
          <ul>
            {state.actionItems.map((a) => (
              <li key={a.id}>
                <div className="item-header">
                  <span><strong>{a.owner}</strong>: {a.task}</span>
                  <ConfidenceBadge value={a.confidence} />
                </div>
                {a.dueDate && <div className="due">Due {a.dueDate}</div>}
                <blockquote className="evidence">&ldquo;{a.evidence.quote}&rdquo;</blockquote>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h3>Open Questions</h3>
        {state.openQuestions.length === 0 ? <EmptyHint label="open questions" /> : (
          <ul>{state.openQuestions.map((q) => <li key={q.id}>{q.question}</li>)}</ul>
        )}
      </section>

      <section className="card">
        <h3>Risks</h3>
        {state.risks.length === 0 ? <EmptyHint label="risks" /> : (
          <ul>
            {state.risks.map((r) => (
              <li key={r.id}>
                <strong>{r.risk}</strong>
                {r.mitigation && <div className="mitigation">Mitigation: {r.mitigation}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {state.snapshots.length > 0 && (
        <section className="card span-full">
          <h3>Timeline</h3>
          <div className="timeline">
            {state.snapshots.map((snap, i) => (
              <div key={i} className="timeline-entry">
                <span className="timeline-ts">{new Date(snap.timestamp).toLocaleTimeString()}</span>
                <p>{snap.summary.slice(0, 200)}{snap.summary.length > 200 ? "…" : ""}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
