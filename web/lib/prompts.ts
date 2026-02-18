export function meetingDeltaPrompt(stateJson: string, chunkJson: string): string {
  return `You are a meeting intelligence extractor. Analyze the new transcript chunk against the current meeting state and return ONLY a JSON object with this EXACT structure:

{
  "summaryIncrement": "2-4 sentence incremental summary of what was discussed in this chunk",
  "decisions": [
    {
      "id": "d-<unique>",
      "decision": "The decision that was made",
      "evidence": { "quote": "exact words from transcript", "chunkId": "from chunk", "timestamp": "ISO string" },
      "confidence": 0.8
    }
  ],
  "actionItems": [
    {
      "id": "a-<unique>",
      "owner": "person name or 'Unassigned'",
      "task": "what needs to be done",
      "dueDate": "ISO date or omit",
      "evidence": { "quote": "exact words", "chunkId": "from chunk", "timestamp": "ISO string" },
      "confidence": 0.7
    }
  ],
  "openQuestions": [
    { "id": "q-<unique>", "question": "the open question" }
  ],
  "risks": [
    { "id": "r-<unique>", "risk": "the risk", "mitigation": "optional mitigation" }
  ],
  "agendaTopics": ["topic strings"],
  "participants": ["names mentioned"],
  "generatedAt": "ISO datetime now"
}

Rules:
- Only include decisions/actionItems when the transcript has clear evidence. Use the chunkId and timestamp from the chunk object.
- openQuestions and risks are objects with id and text fields, NOT plain strings.
- If nothing relevant, use empty arrays.
- Return ONLY valid JSON, no markdown fences, no explanation.

Current meeting state:
${stateJson}

New transcript chunk:
${chunkJson}`;
}

export function finalArtifactsPrompt(stateJson: string): string {
  return `Generate final meeting artifacts from the meeting state below. Return ONLY a JSON object with this EXACT structure:

{
  "finalSummary": "Comprehensive meeting summary paragraph",
  "nextStepsChecklist": ["Action item 1", "Action item 2"],
  "followUpEmail": {
    "subject": "Meeting Follow-up: <topic>",
    "body": "Full email body text"
  },
  "slackMessage": "Brief Slack-friendly summary with key outcomes",
  "markdownExport": "# Meeting Summary\\n\\nFull markdown document",
  "jiraExport": [
    { "summary": "Ticket title", "description": "Details", "assignee": "person or omit", "dueDate": "date or omit" }
  ]
}

Base everything strictly on the meeting state. Do not invent information. Return ONLY valid JSON, no markdown fences.

Meeting state:
${stateJson}`;
}
