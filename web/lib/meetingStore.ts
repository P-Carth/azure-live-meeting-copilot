import { MeetingStateSchema, type MeetingState } from "@meeting-copilot/shared";
import { isCosmosConfigured, config } from "./config";

// Persist across Next.js HMR recompiles in dev mode by attaching to globalThis.
const globalForStore = globalThis as unknown as {
  __meetingStore?: Map<string, MeetingState>;
};
const inMemoryStore = globalForStore.__meetingStore ??= new Map<string, MeetingState>();

// Lazy-initialized Cosmos container to avoid cold-start cost when Cosmos isn't configured.
let _container: unknown = null;

async function getContainer() {
  if (_container) return _container;
  if (!isCosmosConfigured()) return null;

  const { CosmosClient } = await import("@azure/cosmos");
  const client = new CosmosClient({ endpoint: config.cosmos.endpoint, key: config.cosmos.key });
  _container = client.database(config.cosmos.database).container(config.cosmos.container);
  return _container;
}

export async function getMeetingState(meetingId: string): Promise<MeetingState | null> {
  const container = await getContainer() as any;

  if (container) {
    try {
      const { resource } = await container.item(meetingId, meetingId).read();
      return resource ? MeetingStateSchema.parse(resource) : null;
    } catch {
      return null;
    }
  }

  return inMemoryStore.get(meetingId) ?? null;
}

export async function upsertMeetingState(state: MeetingState): Promise<void> {
  const container = await getContainer() as any;

  if (container) {
    await container.items.upsert({ id: state.meetingId, ...state });
    return;
  }

  inMemoryStore.set(state.meetingId, state);
}

export function createInitialState(meetingId: string): MeetingState {
  return MeetingStateSchema.parse({
    meetingId,
    summarySoFar: "",
    decisions: [],
    actionItems: [],
    openQuestions: [],
    risks: [],
    agendaTopics: [],
    participants: [],
    snapshots: [],
    lastUpdated: new Date().toISOString(),
    processedSequences: []
  });
}
