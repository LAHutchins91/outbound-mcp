import type { Express, Request, Response } from "express";
import { z } from "zod";
import { publicError } from "./lib/errors.js";
import { CHANNELS, KINDS, type Channel, type Kind, type OutboundStore } from "./lib/store.js";

const id = z.string().uuid();
const kind = z.enum(KINDS);
const channel = z.enum(CHANNELS);

type AuthUser = { id: string; email?: string };

export function installWorkspaceApi(
  app: Express,
  deps: {
    authenticate: (req: Request) => Promise<{ user: AuthUser; token: string }>;
    subscriptionState: (userId: string, token: string) => Promise<"ok" | "inactive" | "error">;
    store: OutboundStore;
    allow: (key: string) => boolean;
  }
) {
  async function gate(req: Request, res: Response, write: boolean) {
    if (!deps.allow(`workspace:${req.ip}`)) {
      res.status(429).json({ error: "Too many requests. Retry in one minute." });
      return null;
    }
    let auth: { user: AuthUser; token: string };
    try {
      auth = await deps.authenticate(req);
    } catch {
      res.status(401).json({ error: "Sign in to Outbound." });
      return null;
    }
    if (!write) return auth;
    const state = await deps.subscriptionState(auth.user.id, auth.token);
    if (state === "error") {
      res.status(503).json({ error: "Could not verify your subscription. Please retry." });
      return null;
    }
    if (state !== "ok") {
      res.status(403).json({ error: "A 14-day trial or Pro is required." });
      return null;
    }
    return auth;
  }

  function send(res: Response, data: unknown) {
    res.json({ data });
  }

  function fail(res: Response, error: unknown) {
    const safe = publicError(error);
    res.status(safe.status).json({ error: safe.error });
  }

  app.get("/api/workspace/libraries", async (req, res) => {
    const auth = await gate(req, res, true);
    if (!auth) return;
    try {
      send(res, await deps.store.listLibraries(auth.user.id, Number(req.query.offset ?? 0) || 0));
    } catch (error) {
      fail(res, error);
    }
  });

  app.post("/api/workspace/libraries", async (req, res) => {
    const auth = await gate(req, res, true);
    if (!auth) return;
    const input = z.object({ name: z.string().trim().min(1).max(200), description: z.string().trim().max(4000).optional() }).safeParse(req.body);
    if (!input.success) return res.status(400).json({ error: "Enter a library name." });
    try {
      send(res, await deps.store.createLibrary(auth.user.id, input.data.name, input.data.description ?? null));
    } catch (error) {
      fail(res, error);
    }
  });

  app.get("/api/workspace/export", async (req, res) => {
    const auth = await gate(req, res, false);
    if (!auth) return;
    const libraryId = z.string().uuid().safeParse(req.query.libraryId);
    if (!libraryId.success) return res.status(400).json({ error: "Enter a library id." });
    try {
      const data = await deps.store.exportLibrary(auth.user.id, libraryId.data);
      if (!data) return res.status(404).json({ error: "Library not found" });
      send(res, data);
    } catch (error) {
      fail(res, error);
    }
  });

  app.delete("/api/workspace/libraries/:libraryId", async (req, res) => {
    const auth = await gate(req, res, false);
    if (!auth) return;
    if (!id.safeParse(req.params.libraryId).success) return res.status(400).json({ error: "Enter a library id." });
    try {
      const removed = await deps.store.deleteLibrary(auth.user.id, req.params.libraryId);
      if (!removed) return res.status(404).json({ error: "Library not found" });
      send(res, { deleted: true });
    } catch (error) {
      fail(res, error);
    }
  });

  app.get("/api/workspace/wordings", async (req, res) => {
    const auth = await gate(req, res, true);
    if (!auth) return;
    const libraryId = id.safeParse(req.query.libraryId);
    if (!libraryId.success) return res.status(400).json({ error: "Enter a library id." });
    const wordingKind = kind.safeParse(req.query.kind);
    try {
      send(res, await deps.store.listWordings(auth.user.id, libraryId.data, {
        includeRetired: req.query.includeRetired === "true",
        kind: wordingKind.success ? wordingKind.data : undefined
      }));
    } catch (error) {
      fail(res, error);
    }
  });

  app.post("/api/workspace/wordings", async (req, res) => {
    const auth = await gate(req, res, true);
    if (!auth) return;
    const input = z.object({
      libraryId: id,
      name: z.string().trim().min(1).max(200),
      kind,
      channels: z.array(channel).min(1).max(3),
      body: z.string().trim().min(1).max(8000),
      expectedRevision: z.number().int().positive().optional()
    }).safeParse(req.body);
    if (!input.success) return res.status(400).json({ error: "Enter a name, a kind, a channel, and the exact wording." });
    try {
      send(res, await deps.store.saveDraft({ ownerId: auth.user.id, ...input.data, channels: input.data.channels as Channel[], kind: input.data.kind as Kind }));
    } catch (error) {
      fail(res, error);
    }
  });

  app.post("/api/workspace/wordings/:wordingId/approve", async (req, res) => {
    const auth = await gate(req, res, true);
    if (!auth) return;
    const input = z.object({ expectedRevision: z.number().int().positive() }).safeParse(req.body);
    if (!id.safeParse(req.params.wordingId).success || !input.success) return res.status(400).json({ error: "Enter the current revision." });
    try {
      send(res, await deps.store.approve(auth.user.id, req.params.wordingId, input.data.expectedRevision));
    } catch (error) {
      fail(res, error);
    }
  });

  app.post("/api/workspace/suggestions", async (req, res) => {
    const auth = await gate(req, res, true);
    if (!auth) return;
    const input = z.object({
      wordingId: id,
      proposedBody: z.string().trim().min(1).max(8000),
      note: z.string().trim().max(2000).optional()
    }).safeParse(req.body);
    if (!input.success) return res.status(400).json({ error: "Enter the proposed wording." });
    try {
      send(res, await deps.store.suggest(auth.user.id, input.data.wordingId, input.data.proposedBody, input.data.note ?? ""));
    } catch (error) {
      fail(res, error);
    }
  });

  app.post("/api/workspace/suggestions/:suggestionId/accept", async (req, res) => {
    const auth = await gate(req, res, true);
    if (!auth) return;
    const input = z.object({ expectedRevision: z.number().int().positive() }).safeParse(req.body);
    if (!id.safeParse(req.params.suggestionId).success || !input.success) return res.status(400).json({ error: "Enter the current wording revision." });
    try {
      send(res, await deps.store.accept(auth.user.id, req.params.suggestionId, input.data.expectedRevision));
    } catch (error) {
      fail(res, error);
    }
  });

  app.post("/api/workspace/suggestions/:suggestionId/dismiss", async (req, res) => {
    const auth = await gate(req, res, true);
    if (!auth) return;
    if (!id.safeParse(req.params.suggestionId).success) return res.status(400).json({ error: "Suggestion not found" });
    try {
      send(res, await deps.store.dismiss(auth.user.id, req.params.suggestionId));
    } catch (error) {
      fail(res, error);
    }
  });
}
