# Outbound

Outbound stores the exact wording an assistant is allowed to send. A refund, a date, a feature, or a price can be emailed, posted, or quoted only when that sentence was saved and approved. A draft is not approved. A suggested change does not change the record until it is accepted. Outbound does not send the message, and it does not email anyone.

It works with ChatGPT, Claude, Gemini, Grok, and Cursor, plus any other MCP client that can do Streamable HTTP and OAuth. It is not a ChatGPT-only plugin.

Sign in with an Outbound account when the assistant opens OAuth. Do not paste an API key or password into a header. Wording tools need Pro or an active trial. The trial is 14 days, then Pro. Checkout shows the plan terms. This page does not print a price.

There is no product domain. Run the server and use its `/mcp` path. With the default local base, that is `http://localhost:3000/mcp`. A deployed host uses the same path on `APP_BASE_URL`.

## What the assistant can do

After you approve the connection, the server exposes these tools:

- list_outbound_libraries
- create_outbound_library
- save_sendable_wording
- list_sendable_wording
- get_sendable_wording
- approve_sendable_wording
- retire_sendable_wording
- suggest_sendable_change
- accept_sendable_change
- dismiss_sendable_change
- prepare_outbound_send

`save_sendable_wording` writes a draft. `approve_sendable_wording` is what makes that exact body sendable. `suggest_sendable_change` stores a proposal beside the record and leaves the saved body alone. `accept_sendable_change` copies the proposal onto the record and returns it to draft, so it has to be approved again. `prepare_outbound_send` returns SENDABLE only for an exact approved match on that channel. Otherwise it returns REFUSED. The assistant only calls these tools when you and the host allow it.

## Connect

Cursor, in `~/.cursor/mcp.json` or a project `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "outbound": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

Claude Code:

```bash
claude mcp add --transport http outbound http://localhost:3000/mcp
```

Do not pass an Authorization header. Other clients add the same URL, choose OAuth, and leave client id and secret empty. Outbound supports dynamic client registration. Steps for ChatGPT, Claude, Gemini, Grok, and Cursor are on the server's `/connect` page.

When stdin is a terminal, Outbound serves Streamable HTTP. When stdin is not a terminal, it also speaks MCP on stdio.

Registry metadata for this server is in `server.json` (`io.github.LAHutchins91/outbound`).

## Run

```bash
npm ci
npm test
npm run build
npm start
```

Hosted accounts use Supabase for sign-in and Stripe for the 14-day trial and Pro. Copy `.env.example` to `.env` and set the variables there. `supabase/profiles.sql` creates the billing profile only. Stripe price ids belong in the environment. Outbound never displays the amount.

Sendable wording is stored in `~/.outbound/outbound.json`. The store refuses to open any other product's data file. Set `OUTBOUND_DATA_FILE` only when the path is still `outbound.json` inside a `.outbound` directory. Local stdio, with no account configured, uses the owner `local` in that file. HTTP tool calls still require OAuth and an active trial or Pro.

```bash
docker build -t outbound-mcp .
docker run --rm -p 3000:3000 -v outbound-data:/home/node/.outbound outbound-mcp
```

A container without a terminal on stdin speaks MCP on stdio and still listens on port 3000.
