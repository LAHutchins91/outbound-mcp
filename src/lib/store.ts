import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const OUTBOUND_PRODUCT = "outbound";
export const OUTBOUND_VERSION = 1;

export const KINDS = ["refund", "date", "feature", "price", "notice"] as const;
export const CHANNELS = ["email", "post", "quote"] as const;

export type Kind = (typeof KINDS)[number];
export type Channel = (typeof CHANNELS)[number];
export type WordingStatus = "draft" | "approved" | "retired";
export type SuggestionState = "open" | "accepted" | "dismissed";

export type Library = {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  updatedAt: string;
};

export type Wording = {
  id: string;
  libraryId: string;
  ownerId: string;
  name: string;
  kind: Kind;
  channels: Channel[];
  body: string;
  status: WordingStatus;
  revision: number;
  updatedAt: string;
};

export type Suggestion = {
  id: string;
  wordingId: string;
  ownerId: string;
  proposedBody: string;
  note: string;
  state: SuggestionState;
  createdAt: string;
};

export type OutboundFile = {
  product: typeof OUTBOUND_PRODUCT;
  version: typeof OUTBOUND_VERSION;
  libraries: Library[];
  wordings: Wording[];
  suggestions: Suggestion[];
};

export type SendDecision =
  | {
      decision: "SENDABLE";
      kind: Kind;
      channel: Channel;
      wordingId: string;
      name: string;
      revision: number;
      wording: string;
    }
  | {
      decision: "REFUSED";
      kind: Kind;
      channel: Channel;
      reason: string;
    };

const REFUSAL = "Refusing to open another product's data file";
const ALLOWED_KEYS = new Set(["product", "version", "libraries", "wordings", "suggestions"]);
const FOREIGN_KEYS = [
  "canon",
  "canonEntries",
  "checkpoints",
  "scenes",
  "storyProjects",
  "projects",
  "incidentStates",
  "statementLimits",
  "approvedClaims",
  "bannedPhrases",
  "refundRules",
  "supportPolicies",
  "escalations"
];

export function exactBody(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

export function normalizeChannels(channels: readonly Channel[]): Channel[] {
  const present = new Set(channels);
  return CHANNELS.filter((channel) => present.has(channel));
}

export function outboundDataFile(env: NodeJS.ProcessEnv = process.env, home = os.homedir()): string {
  const override = env.OUTBOUND_DATA_FILE?.trim();
  const file = override ? path.resolve(override) : path.join(home, ".outbound", "outbound.json");
  assertOutboundPath(file);
  return file;
}

export function assertOutboundPath(filePath: string): void {
  const resolved = path.resolve(filePath);
  const base = path.basename(resolved);
  const dir = path.basename(path.dirname(resolved));
  if (base !== "outbound.json" || dir !== ".outbound") {
    throw new Error(REFUSAL);
  }
}

export function emptyOutboundFile(): OutboundFile {
  return { product: OUTBOUND_PRODUCT, version: OUTBOUND_VERSION, libraries: [], wordings: [], suggestions: [] };
}

export function parseOutboundDocument(raw: string): OutboundFile {
  const trimmed = raw.trim();
  if (!trimmed) return emptyOutboundFile();
  if (trimmed.startsWith("SQLite format 3")) throw new Error(REFUSAL);
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(REFUSAL);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(REFUSAL);
  const doc = parsed as Record<string, unknown>;
  if (doc.product !== OUTBOUND_PRODUCT) throw new Error(REFUSAL);
  for (const key of Object.keys(doc)) {
    if (!ALLOWED_KEYS.has(key) || FOREIGN_KEYS.includes(key)) throw new Error(REFUSAL);
  }
  if (doc.version !== OUTBOUND_VERSION) throw new Error("Outbound data file is damaged");
  if (!Array.isArray(doc.libraries) || !Array.isArray(doc.wordings) || !Array.isArray(doc.suggestions)) {
    throw new Error("Outbound data file is damaged");
  }
  return {
    product: OUTBOUND_PRODUCT,
    version: OUTBOUND_VERSION,
    libraries: doc.libraries.map(readLibrary),
    wordings: doc.wordings.map(readWording),
    suggestions: doc.suggestions.map(readSuggestion)
  };
}

function readLibrary(value: unknown): Library {
  const row = record(value);
  return {
    id: text(row.id),
    ownerId: text(row.ownerId),
    name: text(row.name),
    description: row.description == null ? null : text(row.description),
    updatedAt: text(row.updatedAt)
  };
}

function readWording(value: unknown): Wording {
  const row = record(value);
  const kind = text(row.kind);
  const status = text(row.status);
  if (!isKind(kind) || !isStatus(status) || !Array.isArray(row.channels)) throw new Error("Outbound data file is damaged");
  const channels = row.channels.map((item) => text(item));
  if (!channels.every(isChannel)) throw new Error("Outbound data file is damaged");
  return {
    id: text(row.id),
    libraryId: text(row.libraryId),
    ownerId: text(row.ownerId),
    name: text(row.name),
    kind,
    channels: normalizeChannels(channels),
    body: text(row.body),
    status,
    revision: number(row.revision),
    updatedAt: text(row.updatedAt)
  };
}

function readSuggestion(value: unknown): Suggestion {
  const row = record(value);
  const state = text(row.state);
  if (!isSuggestionState(state)) throw new Error("Outbound data file is damaged");
  return {
    id: text(row.id),
    wordingId: text(row.wordingId),
    ownerId: text(row.ownerId),
    proposedBody: text(row.proposedBody),
    note: text(row.note),
    state,
    createdAt: text(row.createdAt)
  };
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Outbound data file is damaged");
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  if (typeof value !== "string") throw new Error("Outbound data file is damaged");
  return value;
}

function number(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) throw new Error("Outbound data file is damaged");
  return value;
}

function isKind(value: string): value is Kind {
  return (KINDS as readonly string[]).includes(value);
}

function isChannel(value: string): value is Channel {
  return (CHANNELS as readonly string[]).includes(value);
}

function isStatus(value: string): value is WordingStatus {
  return value === "draft" || value === "approved" || value === "retired";
}

function isSuggestionState(value: string): value is SuggestionState {
  return value === "open" || value === "accepted" || value === "dismissed";
}

function sameName(left: string, right: string): boolean {
  return left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase();
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function nowIso(): string {
  return new Date().toISOString();
}

export class OutboundStore {
  private chain: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath: string) {
    assertOutboundPath(filePath);
  }

  listLibraries(ownerId: string, offset = 0) {
    return this.locked((data) =>
      data.libraries
        .filter((library) => library.ownerId === ownerId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(offset, offset + 50)
        .map(clone)
    );
  }

  createLibrary(ownerId: string, name: string, description: string | null) {
    return this.locked((data) => {
      const row: Library = {
        id: crypto.randomUUID(),
        ownerId,
        name: exactBody(name),
        description: description == null ? null : exactBody(description) || null,
        updatedAt: nowIso()
      };
      if (!row.name) throw new Error("Library not found");
      data.libraries.push(row);
      return clone(row);
    });
  }

  getLibrary(ownerId: string, libraryId: string) {
    return this.locked((data) => clone(this.library(data, ownerId, libraryId)));
  }

  deleteLibrary(ownerId: string, libraryId: string) {
    return this.locked((data) => {
      const library = this.library(data, ownerId, libraryId);
      if (!library) return false;
      const wordingIds = new Set(data.wordings.filter((row) => row.libraryId === libraryId).map((row) => row.id));
      data.libraries = data.libraries.filter((row) => row.id !== libraryId);
      data.wordings = data.wordings.filter((row) => row.libraryId !== libraryId);
      data.suggestions = data.suggestions.filter((row) => !wordingIds.has(row.wordingId));
      return true;
    });
  }

  exportLibrary(ownerId: string, libraryId: string) {
    return this.locked((data) => {
      const library = this.library(data, ownerId, libraryId);
      if (!library) return null;
      const wordings = data.wordings.filter((row) => row.libraryId === libraryId).map(clone);
      const ids = new Set(wordings.map((row) => row.id));
      return {
        library: clone(library),
        wordings,
        suggestions: data.suggestions.filter((row) => ids.has(row.wordingId)).map(clone)
      };
    });
  }

  saveDraft(input: {
    ownerId: string;
    libraryId: string;
    name: string;
    kind: Kind;
    channels: Channel[];
    body: string;
    expectedRevision?: number;
  }) {
    return this.locked((data) => {
      const library = this.requireLibrary(data, input.ownerId, input.libraryId);
      const name = exactBody(input.name);
      const body = exactBody(input.body);
      const channels = normalizeChannels(input.channels);
      if (!name || !body || channels.length === 0) throw new Error("Wording not found");
      const existing = data.wordings.find((row) => row.libraryId === library.id && row.ownerId === input.ownerId && sameName(row.name, name));
      if (!existing) {
        const row: Wording = {
          id: crypto.randomUUID(),
          libraryId: library.id,
          ownerId: input.ownerId,
          name,
          kind: input.kind,
          channels,
          body,
          status: "draft",
          revision: 1,
          updatedAt: nowIso()
        };
        data.wordings.push(row);
        library.updatedAt = row.updatedAt;
        return clone(row);
      }
      if (existing.status === "retired") throw new Error("Wording is retired");
      const same =
        existing.body === body &&
        existing.kind === input.kind &&
        existing.channels.join(",") === channels.join(",");
      if (existing.status === "approved") {
        if (same) return clone(existing);
        throw new Error("This record is approved. Suggest a change instead of replacing the saved wording.");
      }
      if (same) return clone(existing);
      this.requireRevision(existing, input.expectedRevision);
      existing.name = name;
      existing.kind = input.kind;
      existing.channels = channels;
      existing.body = body;
      existing.status = "draft";
      existing.revision += 1;
      existing.updatedAt = nowIso();
      library.updatedAt = existing.updatedAt;
      return clone(existing);
    });
  }

  approve(ownerId: string, wordingId: string, expectedRevision: number) {
    return this.locked((data) => {
      const row = this.requireWording(data, ownerId, wordingId);
      if (row.status === "retired") throw new Error("Wording is retired");
      this.requireRevision(row, expectedRevision);
      if (row.status === "draft") {
        row.status = "approved";
        row.updatedAt = nowIso();
        this.touch(data, row.libraryId);
      }
      return clone(row);
    });
  }

  retire(ownerId: string, wordingId: string, expectedRevision: number) {
    return this.locked((data) => {
      const row = this.requireWording(data, ownerId, wordingId);
      this.requireRevision(row, expectedRevision);
      if (row.status !== "retired") {
        row.status = "retired";
        row.updatedAt = nowIso();
        this.touch(data, row.libraryId);
      }
      return clone(row);
    });
  }

  listWordings(ownerId: string, libraryId: string, options: { kind?: Kind; includeRetired?: boolean; offset?: number } = {}) {
    return this.locked((data) => {
      this.requireLibrary(data, ownerId, libraryId);
      return data.wordings
        .filter((row) => row.libraryId === libraryId && row.ownerId === ownerId)
        .filter((row) => !options.kind || row.kind === options.kind)
        .filter((row) => options.includeRetired || row.status !== "retired")
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(options.offset ?? 0, (options.offset ?? 0) + 50)
        .map(clone);
    });
  }

  getWording(ownerId: string, wordingId: string) {
    return this.locked((data) => {
      const wording = this.requireWording(data, ownerId, wordingId);
      const suggestions = data.suggestions.filter((row) => row.wordingId === wording.id && row.ownerId === ownerId).map(clone);
      return {
        wording: clone(wording),
        suggestions,
        sendable: wording.status === "approved" ? wording.body : null,
        note:
          wording.status === "approved"
            ? "Only this exact body may be emailed, posted, or quoted, and only on a saved channel."
            : "A draft is not approved. Open suggestions are not the record."
      };
    });
  }

  suggest(ownerId: string, wordingId: string, proposedBody: string, note: string) {
    return this.locked((data) => {
      const wording = this.requireWording(data, ownerId, wordingId);
      if (wording.status === "retired") throw new Error("Wording is retired");
      const body = exactBody(proposedBody);
      if (!body) throw new Error("Suggestion not found");
      const row: Suggestion = {
        id: crypto.randomUUID(),
        wordingId: wording.id,
        ownerId,
        proposedBody: body,
        note: exactBody(note),
        state: "open",
        createdAt: nowIso()
      };
      data.suggestions.push(row);
      return { suggestion: clone(row), wording: clone(wording) };
    });
  }

  accept(ownerId: string, suggestionId: string, expectedRevision: number) {
    return this.locked((data) => {
      const suggestion = this.requireSuggestion(data, ownerId, suggestionId);
      if (suggestion.state !== "open") throw new Error("Suggestion is closed");
      const wording = this.requireWording(data, ownerId, suggestion.wordingId);
      if (wording.status === "retired") throw new Error("Wording is retired");
      if (wording.body !== suggestion.proposedBody) {
        this.requireRevision(wording, expectedRevision);
        wording.body = suggestion.proposedBody;
        wording.status = "draft";
        wording.revision += 1;
        wording.updatedAt = nowIso();
        this.touch(data, wording.libraryId);
      }
      suggestion.state = "accepted";
      return { suggestion: clone(suggestion), wording: clone(wording) };
    });
  }

  dismiss(ownerId: string, suggestionId: string) {
    return this.locked((data) => {
      const suggestion = this.requireSuggestion(data, ownerId, suggestionId);
      const wording = this.requireWording(data, ownerId, suggestion.wordingId);
      const before = clone(wording);
      if (suggestion.state === "open") suggestion.state = "dismissed";
      const after = this.requireWording(data, ownerId, suggestion.wordingId);
      if (before.body !== after.body || before.status !== after.status || before.revision !== after.revision) {
        throw new Error("Revision conflict");
      }
      return { suggestion: clone(suggestion), wording: clone(after) };
    });
  }

  prepareSend(ownerId: string, libraryId: string, kind: Kind, channel: Channel, text: string): Promise<SendDecision> {
    return this.locked((data) => {
      this.requireLibrary(data, ownerId, libraryId);
      const body = exactBody(text);
      const rows = data.wordings.filter(
        (row) => row.libraryId === libraryId && row.ownerId === ownerId && row.kind === kind && row.body === body
      );
      const approved = rows.find((row) => row.status === "approved" && row.channels.includes(channel));
      if (approved) {
        return {
          decision: "SENDABLE" as const,
          kind,
          channel,
          wordingId: approved.id,
          name: approved.name,
          revision: approved.revision,
          wording: approved.body
        };
      }
      if (rows.some((row) => row.status === "approved")) {
        return { decision: "REFUSED" as const, kind, channel, reason: "That wording is not approved for this channel." };
      }
      if (rows.some((row) => row.status === "draft")) {
        return { decision: "REFUSED" as const, kind, channel, reason: "A draft is not approved." };
      }
      const openSuggestion = data.suggestions.some((suggestion) => {
        if (suggestion.ownerId !== ownerId || suggestion.state !== "open" || suggestion.proposedBody !== body) return false;
        const wording = data.wordings.find((row) => row.id === suggestion.wordingId && row.libraryId === libraryId && row.kind === kind);
        return Boolean(wording);
      });
      if (openSuggestion) {
        return {
          decision: "REFUSED" as const,
          kind,
          channel,
          reason: "A suggested change does not change the record until it is accepted."
        };
      }
      return {
        decision: "REFUSED" as const,
        kind,
        channel,
        reason: "That wording is not saved. Do not email, post, or quote a refund, a date, a feature, or a price unless it was saved and approved."
      };
    });
  }

  private async locked<T>(fn: (data: OutboundFile) => Promise<T> | T): Promise<T> {
    const run = this.chain.then(async () => {
      const data = await this.load();
      const result = await fn(data);
      await this.persist(data);
      return result;
    });
    this.chain = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  private async load(): Promise<OutboundFile> {
    assertOutboundPath(this.filePath);
    try {
      const raw = await readFile(this.filePath, "utf8");
      return parseOutboundDocument(raw);
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if (code === "ENOENT") return emptyOutboundFile();
      throw error;
    }
  }

  private async persist(data: OutboundFile): Promise<void> {
    assertOutboundPath(this.filePath);
    if (data.product !== OUTBOUND_PRODUCT) throw new Error(REFUSAL);
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
    await rename(tmp, this.filePath);
  }

  private library(data: OutboundFile, ownerId: string, libraryId: string): Library | null {
    return data.libraries.find((row) => row.id === libraryId && row.ownerId === ownerId) ?? null;
  }

  private requireLibrary(data: OutboundFile, ownerId: string, libraryId: string): Library {
    const library = this.library(data, ownerId, libraryId);
    if (!library) throw new Error("Library not found");
    return library;
  }

  private requireWording(data: OutboundFile, ownerId: string, wordingId: string): Wording {
    const wording = data.wordings.find((row) => row.id === wordingId && row.ownerId === ownerId);
    if (!wording || !this.library(data, ownerId, wording.libraryId)) throw new Error("Wording not found");
    return wording;
  }

  private requireSuggestion(data: OutboundFile, ownerId: string, suggestionId: string): Suggestion {
    const suggestion = data.suggestions.find((row) => row.id === suggestionId && row.ownerId === ownerId);
    if (!suggestion) throw new Error("Suggestion not found");
    return suggestion;
  }

  private requireRevision(row: Wording, expectedRevision: number | undefined) {
    if (expectedRevision !== row.revision) throw new Error("Revision conflict");
  }

  private touch(data: OutboundFile, libraryId: string) {
    const library = data.libraries.find((row) => row.id === libraryId);
    if (library) library.updatedAt = nowIso();
  }
}
