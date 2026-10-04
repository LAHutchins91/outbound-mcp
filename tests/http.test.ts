import type { Server } from "node:http";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/server.js";

let server: Server;
let base: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No port");
  base = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

const headers = { "content-type": "application/json", accept: "application/json, text/event-stream" };

describe("streamable HTTP", () => {
  it("returns Outbound tools from tools/list without an API key", async () => {
    const response = await fetch(`${base}/mcp`, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} })
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { result?: { tools?: Array<{ name: string; description?: string }> } };
    const tools = body.result?.tools ?? [];
    const names = tools.map((tool) => tool.name);
    expect(names).toEqual([
      "list_outbound_libraries",
      "create_outbound_library",
      "save_sendable_wording",
      "list_sendable_wording",
      "get_sendable_wording",
      "approve_sendable_wording",
      "retire_sendable_wording",
      "suggest_sendable_change",
      "accept_sendable_change",
      "dismiss_sendable_change",
      "prepare_outbound_send"
    ]);
    const text = JSON.stringify(tools);
    expect(text).not.toMatch(/\$\d/);
    expect(text).toMatch(/draft is not approved/i);
    expect(text).toMatch(/does not email/i);
  });

  it("rejects a tool call that presents an API key header instead of OAuth", async () => {
    const response = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: { ...headers, "x-api-key": "secret-key" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "list_outbound_libraries", arguments: {} }
      })
    });
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("oauth-protected-resource");
    const body = (await response.json()) as { error?: string };
    expect(body.error).toMatch(/API key/);
  });

  it("serves connect, health, and OAuth metadata", async () => {
    const health = await fetch(`${base}/health`);
    expect(health.status).toBe(200);
    const healthBody = (await health.json()) as { service: string; trialDays: number; dataFile: string };
    expect(healthBody.service).toBe("outbound");
    expect(healthBody.trialDays).toBe(14);
    expect(healthBody.dataFile).toBe("~/.outbound/outbound.json");

    const connect = await fetch(`${base}/connect`);
    const html = await connect.text();
    expect(connect.status).toBe(200);
    for (const name of ["ChatGPT", "Claude", "Gemini", "Grok", "Cursor"]) expect(html).toContain(name);
    expect(html).toContain("Streamable HTTP");
    expect(html).not.toMatch(/\$\d/);
    expect(html).not.toMatch(/continuitywriter\.com/);

    const metadata = await fetch(`${base}/.well-known/oauth-protected-resource/mcp`);
    const oauth = (await metadata.json()) as { resource: string; bearer_methods_supported: string[]; authorization_servers: string[] };
    expect(oauth.resource).toMatch(/\/mcp$/);
    expect(oauth.bearer_methods_supported).toEqual(["header"]);
    expect(oauth.authorization_servers[0]).toMatch(/\/auth\/v1$/);

    const home = await fetch(`${base}/`);
    const homeHtml = await home.text();
    expect(homeHtml).toContain("14-day trial, then Pro");
    expect(homeHtml).not.toMatch(/\$\d/);
    expect(homeHtml).toContain("Do not invent the wording.");
    expect(homeHtml).toContain("does not send the message");
  });

  it("rejects a browser origin that is not an assistant", async () => {
    const response = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: { ...headers, origin: "https://evil.example" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/list", params: {} })
    });
    expect(response.status).toBe(403);
  });

  it("stores a support note without sending email", async () => {
    const response = await fetch(`${base}/api/support`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email: "person@example.com", message: "Please confirm the library export path." })
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { emailed?: boolean };
    expect(body.emailed).toBe(false);
  });
});

describe("package copy", () => {
  it("does not print a price and names the registry entry", () => {
    const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
    const server = readFileSync(new URL("../server.json", import.meta.url), "utf8");
    const glama = readFileSync(new URL("../glama.json", import.meta.url), "utf8");
    expect(readme).not.toMatch(/\$\d/);
    expect(readme).toContain("14-day");
    expect(readme).toContain("~/.outbound/outbound.json");
    expect(JSON.parse(server).name).toBe("io.github.LAHutchins91/outbound");
    expect(JSON.parse(server).websiteUrl).toBeUndefined();
    expect(JSON.parse(glama).maintainers).toEqual(["LAHutchins91"]);
  });
});
