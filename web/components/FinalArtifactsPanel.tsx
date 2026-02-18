"use client";
import { useState } from "react";
import type { FinalMeetingArtifacts } from "@meeting-copilot/shared";

type Tab = "summary" | "email" | "slack" | "markdown" | "jira";

export function FinalArtifactsPanel({ artifacts }: { artifacts: FinalMeetingArtifacts | null }) {
  const [tab, setTab] = useState<Tab>("summary");
  if (!artifacts) return null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "summary", label: "Summary" },
    { key: "email", label: "Email" },
    { key: "slack", label: "Slack" },
    { key: "markdown", label: "Markdown" },
    { key: "jira", label: "Jira" }
  ];

  return (
    <section className="card final-artifacts">
      <h3>Meeting Artifacts</h3>
      <nav className="tab-bar">
        {tabs.map((t) => (
          <button key={t.key} className={`tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>

      <div className="tab-content">
        {tab === "summary" && (
          <>
            <p>{artifacts.finalSummary}</p>
            <h4>Next Steps</h4>
            <ul className="checklist">
              {artifacts.nextStepsChecklist.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </>
        )}
        {tab === "email" && (
          <>
            <p><strong>Subject:</strong> {artifacts.followUpEmail.subject}</p>
            <pre className="artifact-pre">{artifacts.followUpEmail.body}</pre>
          </>
        )}
        {tab === "slack" && (
          <pre className="artifact-pre">{artifacts.slackMessage ?? "No Slack message generated."}</pre>
        )}
        {tab === "markdown" && (
          <pre className="artifact-pre">{artifacts.markdownExport}</pre>
        )}
        {tab === "jira" && (
          <table className="jira-table">
            <thead><tr><th>Summary</th><th>Assignee</th><th>Due</th></tr></thead>
            <tbody>
              {artifacts.jiraExport.map((t, i) => (
                <tr key={i}>
                  <td>{t.summary}</td>
                  <td>{t.assignee ?? "Unassigned"}</td>
                  <td>{t.dueDate ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
