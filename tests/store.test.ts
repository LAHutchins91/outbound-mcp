import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { OutboundStore, assertOutboundPath, parseOutboundDocument } from "../src/lib/store.js";

const dirs: string[] = [];

afterEach(async () => {
  dirs.length = 0;
});

async function storeFile(name = ".outbound") {
  const root = await mkdtemp(path.join(os.tmpdir(), "outbound-store-"));
  dirs.push(root);
  const dir = path.join(root, name);
  await mkdir(dir, { recursive: true });
  return path.join(dir, "outbound.json");
}

describe("outbound store", () => {
  it("refuses another product's path and file without rewriting it", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "outbound-foreign-"));
    const foreignPath = path.join(root, ".continuity", "continuity.json");
    await mkdir(path.dirname(foreignPath), { recursive: true });
    await writeFile(foreignPath, JSON.stringify({ product: "continuity", projects: [] }));
    expect(() => assertOutboundPath(foreignPath)).toThrow(/Refusing to open another product's data file/);
    expect(() => new OutboundStore(foreignPath)).toThrow(/Refusing to open another product's data file/);

    const file = await storeFile();
    const planted = JSON.stringify({ product: "desk", refundRules: [] });
    await writeFile(file, planted);
    const store = new OutboundStore(file);
    await expect(store.listLibraries("local")).rejects.toThrow(/Refusing to open another product's data file/);
    expect(await readFile(file, "utf8")).toBe(planted);

    await writeFile(file, "SQLite format 3\0");
    await expect(store.listLibraries("local")).rejects.toThrow(/Refusing to open another product's data file/);
    expect(await readFile(file, "utf8")).toContain("SQLite format 3");
    expect(() => parseOutboundDocument(JSON.stringify({ product: "status", incidentStates: [] }))).toThrow(/Refusing to open another product's data file/);
    expect(() => parseOutboundDocument(JSON.stringify({ product: "outbound", version: 1, libraries: [], wordings: [], suggestions: [], canon: [] }))).toThrow(
      /Refusing to open another product's data file/
    );
  });

  it("keeps a draft unsendable until approval, and a suggestion off the record until accept", async () => {
    const file = await storeFile();
    const store = new OutboundStore(file);
    const library = await store.createLibrary("local", "Replies", null);
    const draft = await store.saveDraft({
      ownerId: "local",
      libraryId: library.id,
      name: "Refund window",
      kind: "refund",
      channels: ["email", "quote"],
      body: "We refund unused time within 14 days of the invoice."
    });
    expect(draft.status).toBe("draft");
    const blocked = await store.prepareSend("local", library.id, "refund", "email", draft.body);
    expect(blocked.decision).toBe("REFUSED");
    if (blocked.decision === "REFUSED") expect(blocked.reason).toMatch(/draft is not approved/);

    const approved = await store.approve("local", draft.id, draft.revision);
    expect(approved.status).toBe("approved");
    const allowed = await store.prepareSend("local", library.id, "refund", "email", approved.body);
    expect(allowed).toMatchObject({ decision: "SENDABLE", wording: approved.body });
    const wrongChannel = await store.prepareSend("local", library.id, "refund", "post", approved.body);
    expect(wrongChannel.decision).toBe("REFUSED");

    await expect(
      store.saveDraft({
        ownerId: "local",
        libraryId: library.id,
        name: "Refund window",
        kind: "refund",
        channels: ["email"],
        body: "We refund unused time within 30 days of the invoice."
      })
    ).rejects.toThrow(/Suggest a change/);

    const suggestion = await store.suggest("local", approved.id, "We refund unused time within 30 days of the invoice.", "longer window");
    expect(suggestion.wording.body).toBe(approved.body);
    expect(suggestion.wording.status).toBe("approved");
    expect(suggestion.wording.revision).toBe(approved.revision);
    const suggested = await store.prepareSend("local", library.id, "refund", "email", suggestion.suggestion.proposedBody);
    expect(suggested.decision).toBe("REFUSED");
    if (suggested.decision === "REFUSED") expect(suggested.reason).toMatch(/until it is accepted/);

    const accepted = await store.accept("local", suggestion.suggestion.id, approved.revision);
    expect(accepted.wording.body).toBe(suggestion.suggestion.proposedBody);
    expect(accepted.wording.status).toBe("draft");
    expect(accepted.wording.revision).toBe(approved.revision + 1);
    const afterAccept = await store.prepareSend("local", library.id, "refund", "email", accepted.wording.body);
    expect(afterAccept.decision).toBe("REFUSED");

    const again = await store.approve("local", accepted.wording.id, accepted.wording.revision);
    const finalSend = await store.prepareSend("local", library.id, "refund", "quote", again.body);
    expect(finalSend).toMatchObject({ decision: "SENDABLE", wording: again.body });

    const raw = JSON.parse(await readFile(file, "utf8")) as { product: string };
    expect(raw.product).toBe("outbound");
    expect(await store.listLibraries("someone-else")).toEqual([]);
    await expect(store.prepareSend("someone-else", library.id, "refund", "email", again.body)).rejects.toThrow(/Library not found/);
  });
});
