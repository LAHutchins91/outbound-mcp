import { canonicalPublicOrigin } from "./public-url.js";

function htmlEscape(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

export function landingConnectLead(baseUrl: string) {
  const origin = canonicalPublicOrigin(baseUrl);
  const mcp = htmlEscape(`${origin}/mcp`);
  const connect = htmlEscape(`${origin}/connect`);
  return `<p>MCP address: <code>${mcp}</code>. <a href="${connect}">Connect an assistant</a>.</p>`;
}

export function connectPageBody(baseUrl: string) {
  const origin = canonicalPublicOrigin(baseUrl);
  const mcp = htmlEscape(`${origin}/mcp`);
  return `<p>Outbound is one OAuth-protected wording library for ChatGPT, Claude, Gemini, Grok, Cursor, and any other MCP client that speaks Streamable HTTP. It is not a ChatGPT-only plugin. Sendable-wording tools require an Outbound account with Pro or an active 14-day trial. Billing stays in the workspace. No assistant can change the plan, and Outbound does not print a price. Outbound does not email anyone.</p>
<section><h2>Shared connection</h2>
<p>MCP address:</p><p><code>${mcp}</code></p>
<p>Transport: Streamable HTTP. Sign in with an Outbound account when the assistant opens OAuth. Do not paste an API key, access token, or password into a header or into chat. Revoke a host at any time from <a href="/connections">connected applications</a>.</p>
<ol><li><a href="/app">Sign in</a> and create a library you will recognize by name.</li><li>Add the MCP address using the steps below. Choose OAuth and dynamic client registration when the host asks how to authenticate.</li><li>Approve Outbound, then ask the assistant to call <code>prepare_outbound_send</code> before it emails, posts, or quotes a refund, a date, a feature, or a price.</li></ol>
</section>
<section><h2>1. ChatGPT and Codex</h2>
<p>Connect Outbound as a custom app. A public directory listing is not required.</p>
<ol><li>On workspace plans, an admin enables developer mode for custom MCP connectors. Personal accounts that already offer custom apps can skip that toggle.</li><li>Open Apps, then Create. Paste the MCP address, choose OAuth, scan tools, and approve the Outbound sign-in.</li><li>Enable the app in the conversation. Developer-mode apps are labeled Dev and are not OpenAI-verified.</li></ol>
<p>Codex can use this same MCP address. Request <code>offline_access</code> when the host offers refresh. Outbound’s authorization server advertises that scope.</p>
</section>
<section><h2>2. Claude</h2>
<p>Claude.ai, Claude Desktop, and Claude Code call Outbound over Streamable HTTP. You do not install a local plugin for the hosted apps.</p>
<ol><li>Add a custom connector named Outbound and paste the MCP address.</li><li>Choose OAuth. Register the client automatically. Leave client id and secret empty. Do not put a token in request headers.</li><li>Approve Outbound in the browser, then turn the connector on for the chat.</li></ol>
<p>Claude Code, from a terminal:</p>
<pre><code>claude mcp add --transport http outbound ${mcp}</code></pre>
<p>Do not pass <code>--header Authorization</code>. Claude Code opens the same OAuth flow.</p>
</section>
<section><h2>3. Gemini</h2>
<p>Gemini Apps can add a custom MCP server on the web for eligible personal Google accounts. Paste the MCP address under Connected apps, Custom apps, and leave advanced credentials empty. Outbound supports dynamic client registration, so a client id is not required. In a chat, type <code>@</code> and choose Outbound.</p>
<pre><code>gemini mcp add --transport http --scope user outbound ${mcp}</code></pre>
<p>Do not set an Authorization header. Gemini Enterprise forms that require a pre-registered client id are outside this server’s published client. The authorization server is the issuer advertised at <code>/.well-known/oauth-protected-resource/mcp</code>. The scopes are <code>email</code> and <code>offline_access</code>.</p>
</section>
<section><h2>4. Grok</h2>
<ol><li>Open grok.com/connectors.</li><li>Choose New connector, then Custom.</li><li>Paste the MCP address and finish the sign-in Grok presents.</li></ol>
<pre><code>grok mcp add --transport http outbound ${mcp}</code></pre>
<p>Do not set an Authorization header. The xAI API remote-MCP tool wants a static bearer token. Outbound does not issue API keys for that field. Use grok.com or Grok Build, which perform OAuth.</p>
</section>
<section><h2>5. Cursor and any other Streamable HTTP client</h2>
<p>In <code>~/.cursor/mcp.json</code> or a project <code>.cursor/mcp.json</code>:</p>
<pre><code>{
  "mcpServers": {
    "outbound": {
      "url": "${mcp}"
    }
  }
}</code></pre>
<p>Do not add <code>headers</code> or a static client id. Cursor registers a client and opens sign-in.</p>
<p>Any other MCP client uses the same address when it supports Streamable HTTP, OAuth 2.0 with PKCE, and dynamic client registration. An unauthenticated tool call returns <code>401</code> with a <code>WWW-Authenticate</code> challenge pointing at <code>/.well-known/oauth-protected-resource/mcp</code>. Ask for the <code>email</code> scope. Add <code>offline_access</code> when the client can refresh tokens. Clients that call from their own servers should omit a browser <code>Origin</code>. Browser calls are accepted from Outbound’s own origin and from ChatGPT, Claude, Gemini, Grok, and Cursor.</p>
</section>
<section><h2>After it connects</h2>
<p>Ask the assistant to save a draft, wait for approval, and call <code>prepare_outbound_send</code> before it uses a refund, a date, a feature, or a price. A draft is not approved. A suggested change is not the record until it is accepted, and the accepted text is a draft until it is approved again.</p>
<p>The assistant calls tools only when you and the host allow it. Disconnecting an application stops future access. It does not delete the library. Outbound never sends the wording itself.</p>
</section>`;
}
