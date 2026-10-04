import type { Express } from "express";
import { connectPageBody } from "./connect-page.js";

export const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" rx="56" fill="#1c2430"/><rect x="48" y="68" width="160" height="120" rx="18" fill="#f7f1e6"/><path d="M58 84l70 52 70-52" fill="none" stroke="#c4553a" stroke-width="12" stroke-linejoin="round"/></svg>`;

const page = (title: string, body: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Outbound</title><link rel="icon" href="/icon.svg"><style>body{margin:0;background:#f7f1e6;color:#1c2430;font:17px/1.65 system-ui}main{max-width:840px;margin:40px auto;padding:24px}a{color:#9a3412}h1{line-height:1.15;font-size:40px}h2{margin-top:32px}nav,footer{display:flex;flex-wrap:wrap;gap:18px}section{border:1px solid #e4d8c8;border-radius:16px;padding:22px;margin:22px 0;background:#fffdf8}input,textarea,select,button{font:inherit;box-sizing:border-box;max-width:100%;padding:10px;border:1px solid #e4d8c8;border-radius:8px;background:#fff;color:inherit}input,textarea{width:100%}label{display:block;margin:12px 0}button{cursor:pointer;margin:12px 8px 12px 0}code,pre{overflow-wrap:anywhere}pre{overflow:auto;background:#fff;padding:12px;border-radius:8px}#message{white-space:pre-wrap}small{color:#5c5348}</style></head><body><main><nav><a href="/app">Outbound</a><a href="/connect">Connect an assistant</a><a href="/support">Support</a></nav><h1>${title}</h1>${body}<footer><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/data">Your data</a></footer></main></body></html>`;

export function installPublicPages(app: Express, baseUrl: string, supabaseUrl: string, anonKey: string) {
  app.get("/access", (_req, res) =>
    res.type("html").send(page("Outbound access", `<p>Sendable-wording tools are available during a 14-day trial and then on Pro. This connection has no entitlement at present. It cannot change the plan. Outbound does not print a price, and it does not email anyone.</p><p><a href="/connections">Manage the connection</a> or <a href="/support">leave a support note</a> if access looks incorrect.</p>`))
  );
  app.get("/icon.svg", (_req, res) => res.type("svg").send(logo));
  app.get("/connect", (_req, res) => res.type("html").send(page("Connect an assistant", connectPageBody(baseUrl))));
  app.get("/privacy", (_req, res) =>
    res.type("html").send(page("Privacy", `<p>Effective October 4, 2026. Outbound stores the exact wording an account has saved. The operator is reached through the <a href="/support">support note</a> on this server. That form does not send email.</p>
<h2>What is stored</h2>
<p>Sign-in uses the configured identity provider and may process an account id, email, and subscription status. Stripe processes checkout. Outbound does not store card numbers and does not print a price.</p>
<p>Libraries, drafts, approved sentences, and suggestions are written to <code>~/.outbound/outbound.json</code> on the machine running this server. Outbound refuses to open another product's data file. Wording is not placed in a story database, and it is not emailed.</p>
<p>Tools receive only the arguments a host submits. Do not put passwords or payment card numbers in wording.</p>
<h2>Who can read it</h2>
<p>The signed-in account can read and change its own rows. An assistant receives a sentence only when a tool is invoked and, for a send, only when that exact sentence is approved. Connected clients such as ChatGPT, Claude, Gemini, Grok, and Cursor apply their own terms.</p>
<h2>Retention</h2>
<p>A library stays until you delete it. <a href="/data">Export or delete a library</a> remains available after Pro ends. Disconnecting an assistant does not delete wording.</p>`))
  );
  app.get("/terms", (_req, res) =>
    res.type("html").send(page("Terms", `<p>Effective October 4, 2026. These terms govern Outbound.</p>
<h2>Wording you save</h2>
<p>You keep your rights in text you submit. You let the operator store and return it so the service can run. Save only text you have the right to use.</p>
<h2>Trial and Pro</h2>
<p>Sendable-wording tools require a 14-day trial and then Pro. Checkout shows the plan terms. This server does not print a price. Manage cancellation in the billing portal. Cancellation does not delete the library.</p>
<h2>What Outbound will not do</h2>
<p>A draft is not approved. A suggestion does not change the record until it is accepted, and the accepted text is not sendable until it is approved. The assistant must not email, post, or quote a refund, a date, a feature, or a price unless <code>prepare_outbound_send</code> returns that exact sentence. Outbound itself does not email, post, or otherwise transmit the wording. It cannot force a host to call the tool.</p>
<p>Review anything important before a person sends it.</p>`))
  );
  app.get("/support", (_req, res) =>
    res.type("html").send(page("Support", `<p>Leave a note for the operator of this server. The note is stored locally. Outbound does not send email, and this form does not email anyone. Do not include passwords, tokens, or card numbers.</p>
<form id="support"><label>Reply address<input name="email" type="email" required maxlength="254"></label><label>Note<textarea name="message" required minlength="10" maxlength="4000" rows="7"></textarea></label><button type="submit">Store note</button></form>
<p id="message" role="status"></p>
<script>document.getElementById('support').onsubmit=async function(e){e.preventDefault();var button=this.querySelector('button');button.disabled=true;try{var r=await fetch('/api/support',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:this.email.value,message:this.message.value})});var d=await r.json();if(!r.ok)throw Error(d.error||'Unable to store the note');document.getElementById('message').textContent='Note stored. Reference: '+d.id+'. No email was sent.';this.reset()}catch(err){document.getElementById('message').textContent=err.message}finally{button.disabled=false}};</script>`))
  );
  app.get("/data", (_req, res) => {
    const config = JSON.stringify({ url: supabaseUrl, key: anonKey }).replace(/</g, "\\u003c");
    res.type("html").send(page("Your data", `<p>Export or delete a library. Wording lives in <code>~/.outbound/outbound.json</code> on this host. These controls stay available after Pro ends. <a href="/app">Sign in first</a>. <a href="/connections">Disconnect applications</a> separately. Nothing here sends email.</p>
<section><label>Library id<input id="libraryId" autocomplete="off"></label><button id="export" type="button">Download JSON archive</button><button id="remove" type="button">Delete library</button><p id="message" role="status"></p></section>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/dist/umd/supabase.js"></script>
<script>var cfg=${config};document.getElementById('export').onclick=function(){run(false)};document.getElementById('remove').onclick=function(){if(!confirm('Delete this library and its wording?'))return;run(true)};async function run(remove){var status=document.getElementById('message');status.textContent='Working…';try{if(!cfg.url||!cfg.key||!window.supabase)throw Error('Sign-in is not configured on this server.');var client=window.supabase.createClient(cfg.url,cfg.key);var session=await client.auth.getSession();if(!session.data.session)throw Error('Sign in to Outbound first.');var library=document.getElementById('libraryId').value.trim();if(!library)throw Error('Enter a library id.');var path=remove?'/api/workspace/libraries/'+encodeURIComponent(library):'/api/workspace/export?libraryId='+encodeURIComponent(library);var r=await fetch(path,{method:remove?'DELETE':'GET',headers:{Authorization:'Bearer '+session.data.session.access_token}});var d=await r.json();if(!r.ok)throw Error(d.error||'Request could not complete.');if(remove){status.textContent='Library deleted.';return}var url=URL.createObjectURL(new Blob([JSON.stringify(d.data,null,2)],{type:'application/json'}));var a=document.createElement('a');a.href=url;a.download='outbound-library.json';a.click();setTimeout(function(){URL.revokeObjectURL(url)},1000);status.textContent='Archive downloaded.'}catch(err){status.textContent=err.message}}</script>`));
  });
}

export { page };
