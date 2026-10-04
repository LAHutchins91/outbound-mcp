export function renderLanding(input: { supabaseUrl: string; supabaseAnonKey: string; appBaseUrl: string; connectLead: string }) {
  const supabaseUrl = JSON.stringify(input.supabaseUrl);
  const supabaseAnonKey = JSON.stringify(input.supabaseAnonKey);
  const appBaseUrl = JSON.stringify(input.appBaseUrl);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Outbound</title>
  <link rel="icon" href="/icon.svg">
  <style>
    :root{color-scheme:light;--bg:#f7f1e6;--text:#1c2430;--muted:#5c5348;--line:#e4d8c8;--accent:#9a3412;--card:#fffdf8}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:18px/1.55 ui-sans-serif,system-ui,sans-serif}
    main{max-width:980px;margin:0 auto;padding:28px 20px 72px}a{color:var(--accent)}
    nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:36px}.brand{font-weight:800;letter-spacing:-.03em}
    h1{font-size:clamp(40px,7vw,68px);line-height:.95;letter-spacing:-.045em;margin:8px 0 16px}
    .muted{color:var(--muted)} .card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:20px}
    .grid{display:grid;grid-template-columns:1.2fr .8fr;gap:22px}.plans{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    button,.btn{font:inherit;border-radius:12px;padding:12px 16px;border:1px solid var(--line);background:#fff;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
    .primary{background:var(--accent);color:#fff;border-color:var(--accent)} button:disabled{opacity:.55;cursor:wait}
    label{display:block;margin:12px 0 4px} input,textarea,select{width:100%;padding:10px;border:1px solid var(--line);border-radius:10px;font:inherit;background:#fff}
    textarea{min-height:90px} .row{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px} .error{color:#8d1d18} .ok{color:#9a3412}
    article.item{border-top:1px solid var(--line);padding:10px 0} [hidden]{display:none!important}
    footer{display:flex;gap:16px;flex-wrap:wrap;margin-top:48px;color:var(--muted)}
    @media(max-width:760px){.grid,.plans{grid-template-columns:1fr}}
  </style>
</head>
<body>
<main>
  <nav><div class="brand">Outbound</div><span class="muted">Exact wording, or it is not sent</span></nav>
  <section class="grid">
    <div>
      <p class="muted">Sendable sentences, saved before they go out</p>
      <h1>Do not invent the wording.</h1>
      <p>Outbound keeps the exact text an assistant may email, post, or quote. A refund, a date, a feature, or a price has to be saved and approved first. A draft is not approved. A suggested change does not change the record until it is accepted. Outbound does not send the message.</p>
      ${input.connectLead}
      <div class="row" id="signedOutActions"><button class="primary" id="googleBtn" type="button">Continue with Google</button><a class="btn" href="#plans">See trial and Pro</a></div>
      <div class="card" id="accountCard" hidden>
        <p class="muted">Signed in</p>
        <p id="userEmail"></p>
        <p id="subscriptionStatus" class="muted">Checking account…</p>
        <div class="row"><button id="signOutBtn" type="button">Sign out</button><button id="portalBtn" type="button">Manage billing</button><a class="btn primary" id="workspaceLink" href="/app">Open wording library</a></div>
      </div>
      <p id="notice" class="ok" role="status"></p>
      <p id="error" class="error" role="alert"></p>
    </div>
    <aside class="card">
      <p><strong>Draft</strong><br><span class="muted">Saved, and still not allowed to leave.</span></p>
      <p><strong>Approved</strong><br><span class="muted">The only exact sentence that may be emailed, posted, or quoted.</span></p>
      <p><strong>Suggestion</strong><br><span class="muted">A proposed replacement. The record stays put until you accept it.</span></p>
      <p><strong>No send button</strong><br><span class="muted">Outbound stores wording. It does not email anyone.</span></p>
    </aside>
  </section>
  <section id="plans">
    <h2>14-day trial, then Pro</h2>
    <p class="muted">Monthly and yearly checkout are handled by Stripe. Checkout shows the plan terms. Outbound does not print a price.</p>
    <div class="plans">
      <article class="card"><h3>Monthly</h3><p>A 14-day trial, then Pro, billed each month.</p><ul><li>Wording libraries</li><li>Drafts and approval</li><li>Suggestions that wait</li><li>Exact-match send check</li></ul><button class="checkout" data-plan="monthly" type="button">Start monthly trial</button></article>
      <article class="card"><h3>Yearly</h3><p>The same 14-day trial, then Pro, billed once a year.</p><ul><li>Everything in Monthly</li><li>One annual billing cycle</li><li>Same refusal rules</li></ul><button class="primary checkout" data-plan="annual" type="button">Start yearly trial</button></article>
    </div>
  </section>
  <section id="workspace" hidden>
    <h2>Wording library</h2>
    <p class="muted">Save a draft. Approve it only when the sentence is the one that may go out. A suggestion sits beside the record until you accept it, and the new text is a draft again.</p>
    <div class="grid">
      <form id="libraryForm" class="card"><h3>New library</h3><label for="libraryName">Name</label><input id="libraryName" required maxlength="200"><label for="libraryDescription">Description</label><textarea id="libraryDescription" maxlength="4000"></textarea><button class="primary" type="submit">Create library</button></form>
      <div class="card"><h3>Libraries</h3><label for="librarySelect">Open</label><select id="librarySelect"><option value="">Choose a library</option></select></div>
    </div>
    <div id="editor" hidden>
      <form id="draftForm" class="card"><h3>Save a draft</h3><label>Name<input id="wordName" required maxlength="200"></label><label>Kind<select id="wordKind"><option>refund</option><option>date</option><option>feature</option><option>price</option><option>notice</option></select></label><label>Channels</label><label><input class="channel" type="checkbox" value="email" checked> email</label><label><input class="channel" type="checkbox" value="post" checked> post</label><label><input class="channel" type="checkbox" value="quote" checked> quote</label><label>Exact wording<textarea id="wordBody" required maxlength="8000"></textarea></label><button class="primary" type="submit">Save draft</button></form>
      <form id="suggestForm" class="card"><h3>Suggest a change</h3><label>Wording id<input id="suggestWordingId" required></label><label>Current revision<input id="suggestRevision" required inputmode="numeric"></label><label>Proposed wording<textarea id="suggestBody" required maxlength="8000"></textarea></label><button type="submit">Suggest</button><button id="acceptSuggestion" type="button">Accept suggestion id</button><input id="suggestionId" placeholder="Suggestion id"> </form>
      <div class="card"><h3>Saved wording</h3><div id="wordList"></div></div>
    </div>
    <p id="workspaceMessage" role="status"></p>
  </section>
  <footer><a href="/connect">Connect an assistant</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/support">Support</a><a href="/data">Your data</a><a href="/health">System health</a></footer>
</main>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/dist/umd/supabase.js"></script>
<script>
(function(){
  var SUPABASE_URL=${supabaseUrl}, SUPABASE_ANON_KEY=${supabaseAnonKey}, APP_BASE_URL=${appBaseUrl};
  var token="", isPro=false, ready=false, client=null, selected="";
  function el(id){return document.getElementById(id)}
  function showError(msg){el("error").textContent=msg}
  function clearError(){el("error").textContent=""}
  function renderAccess(pro, accountReady){
    isPro=pro; ready=accountReady;
    el("plans").hidden=pro;
    el("workspace").hidden=!(pro&&location.pathname==="/app");
    el("workspaceLink").hidden=!pro;
    if(pro&&location.pathname==="/app") void loadLibraries().catch(function(err){el("workspaceMessage").textContent=err.message});
  }
  function setSignedOut(){token="";el("accountCard").hidden=true;el("signedOutActions").hidden=false;renderAccess(false,true);el("subscriptionStatus").textContent=""}
  function setSignedIn(session){
    token=session.access_token||"";
    el("userEmail").textContent=(session.user&&session.user.email)||"Signed in";
    el("accountCard").hidden=false; el("signedOutActions").hidden=true;
    void loadProfile(session);
  }
  async function loadProfile(session){
    try{
      var r=await fetch(SUPABASE_URL+"/rest/v1/profiles?id=eq."+encodeURIComponent(session.user.id)+"&select=plan,subscription_status",{headers:{apikey:SUPABASE_ANON_KEY,Authorization:"Bearer "+token}});
      var rows=await r.json();
      var p=rows&&rows[0];
      var pro=Boolean(p&&(p.subscription_status==="trialing"||p.subscription_status==="active"));
      renderAccess(pro,true);
      el("subscriptionStatus").textContent=pro?(p.subscription_status==="trialing"?"Outbound · Trial in progress":"Outbound Pro · Active"):"Signed in · start a 14-day trial below";
    }catch(e){renderAccess(false,false);el("subscriptionStatus").textContent="Unable to confirm your subscription."}
  }
  async function api(path, options){
    var opts=options||{}; opts.headers=Object.assign({"Content-Type":"application/json",Authorization:"Bearer "+token},opts.headers||{});
    var r=await fetch(path,opts); var text=await r.text(); var data=text?JSON.parse(text):null;
    if(!r.ok) throw new Error((data&&data.error)||"Request could not complete.");
    return data.data;
  }
  async function loadLibraries(){
    var rows=await api("/api/workspace/libraries");
    var select=el("librarySelect"); select.replaceChildren(new Option("Choose a library",""));
    rows.forEach(function(library){select.add(new Option(library.name,library.id))});
    if(selected) select.value=selected;
  }
  async function loadWordings(){
    if(!selected){el("editor").hidden=true;return}
    el("editor").hidden=false;
    var rows=await api("/api/workspace/wordings?includeRetired=true&libraryId="+encodeURIComponent(selected));
    var list=el("wordList"); list.replaceChildren();
    rows.forEach(function(row){
      var box=document.createElement("article"); box.className="item";
      var title=document.createElement("strong"); title.textContent=row.name+" · "+row.kind+" · "+row.status+" · rev "+row.revision; box.appendChild(title);
      var body=document.createElement("p"); body.textContent=row.body; box.appendChild(body);
      var meta=document.createElement("p"); meta.className="muted"; meta.textContent=row.channels.join(", ")+" · "+row.id; box.appendChild(meta);
      if(row.status==="draft"){
        var button=document.createElement("button"); button.type="button"; button.textContent="Approve";
        button.onclick=async function(){try{await api("/api/workspace/wordings/"+row.id+"/approve",{method:"POST",body:JSON.stringify({expectedRevision:row.revision})});await loadWordings();el("workspaceMessage").textContent="Approved. The exact sentence may now be checked for send."}catch(err){el("workspaceMessage").textContent=err.message}};
        box.appendChild(button);
      }
      list.appendChild(box);
    });
    if(!list.childNodes.length) list.textContent="No wording saved in this library yet.";
  }
  function channels(){return Array.prototype.map.call(document.querySelectorAll(".channel:checked"),function(node){return node.value})}
  el("librarySelect").onchange=function(){selected=this.value;void loadWordings().catch(function(err){el("workspaceMessage").textContent=err.message})};
  el("libraryForm").onsubmit=async function(e){e.preventDefault();try{var row=await api("/api/workspace/libraries",{method:"POST",body:JSON.stringify({name:el("libraryName").value.trim(),description:el("libraryDescription").value.trim()||undefined})});selected=row.id;this.reset();await loadLibraries();await loadWordings();el("workspaceMessage").textContent="Library created. Wording saved next is a draft."}catch(err){el("workspaceMessage").textContent=err.message}};
  el("draftForm").onsubmit=async function(e){e.preventDefault();try{var picked=channels();if(!picked.length)throw Error("Choose at least one channel.");await api("/api/workspace/wordings",{method:"POST",body:JSON.stringify({libraryId:selected,name:el("wordName").value,kind:el("wordKind").value,channels:picked,body:el("wordBody").value})});await loadWordings();el("workspaceMessage").textContent="Draft saved. It is not approved."}catch(err){el("workspaceMessage").textContent=err.message}};
  el("suggestForm").onsubmit=async function(e){e.preventDefault();try{var result=await api("/api/workspace/suggestions",{method:"POST",body:JSON.stringify({wordingId:el("suggestWordingId").value.trim(),proposedBody:el("suggestBody").value})});el("suggestionId").value=result.suggestion.id;el("workspaceMessage").textContent="Suggestion stored. The saved wording did not change."}catch(err){el("workspaceMessage").textContent=err.message}};
  el("acceptSuggestion").onclick=async function(){try{await api("/api/workspace/suggestions/"+encodeURIComponent(el("suggestionId").value.trim())+"/accept",{method:"POST",body:JSON.stringify({expectedRevision:Number(el("suggestRevision").value)})});await loadWordings();el("workspaceMessage").textContent="Suggestion accepted. The new text is a draft until you approve it."}catch(err){el("workspaceMessage").textContent=err.message}};
  function resume(){
    try{var saved=sessionStorage.getItem("outboundPluginReturn");if(!saved)return false;sessionStorage.removeItem("outboundPluginReturn");var pending=JSON.parse(saved);if(!pending||Date.now()-pending.createdAt>600000)return false;location.assign(pending.id?"/oauth/consent?authorization_id="+encodeURIComponent(pending.id):"/connections");return true}catch(e){return false}
  }
  async function init(){
    if(!SUPABASE_URL||!SUPABASE_ANON_KEY||!window.supabase){setSignedOut();showError("Google sign-in is not configured yet.");return}
    client=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{flowType:"implicit",persistSession:true,detectSessionInUrl:true,autoRefreshToken:true}});
    client.auth.onAuthStateChange(function(_e,session){if(session){if(resume())return;setSignedIn(session)}else setSignedOut()});
    var result=await client.auth.getSession();
    var session=result&&result.data?result.data.session:null;
    if(session){if(resume())return;setSignedIn(session)}else setSignedOut();
  }
  el("googleBtn").onclick=async function(){clearError();if(!client){showError("Google sign-in is not configured yet.");return}this.disabled=true;try{var r=await client.auth.signInWithOAuth({provider:"google",options:{redirectTo:APP_BASE_URL}});if(r.error)throw r.error}catch(e){this.disabled=false;showError(e.message||String(e))}};
  el("signOutBtn").onclick=async function(){if(client)await client.auth.signOut();setSignedOut();location.href="/"};
  el("portalBtn").onclick=async function(){try{var r=await fetch("/billing/portal",{method:"POST",headers:{Authorization:"Bearer "+token}});var d=await r.json();if(!r.ok)throw Error(d.error||"Unable to open billing");location.href=d.url}catch(e){showError(e.message)}};
  document.querySelectorAll(".checkout").forEach(function(btn){btn.onclick=async function(){clearError();if(!token){showError("Sign in with Google first, then start the trial.");return}if(isPro||!ready){showError("Refresh your subscription status before starting checkout.");return}btn.disabled=true;try{var r=await fetch("/billing/checkout",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({plan:btn.getAttribute("data-plan")})});var d=await r.json();if(!r.ok)throw Error(d.error||"Unable to start checkout");location.href=d.url}catch(e){btn.disabled=false;showError(e.message)}}});
  var checkout=new URLSearchParams(location.search).get("checkout");
  if(checkout==="success") el("notice").textContent="Checkout completed. The subscription is being confirmed.";
  if(checkout==="cancelled") showError("Checkout was cancelled. No changes were made.");
  init();
})();
</script>
</body></html>`;
}
