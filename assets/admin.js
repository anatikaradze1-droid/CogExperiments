(() => {
const A=document.getElementById("app"),badge=document.getElementById("modeBadge"),logout=document.getElementById("logoutBtn");
badge.textContent=CogDB.demo?"DEMO MODE":"LIVE / SUPABASE";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>crypto.randomUUID(),slugify=s=>s.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-|-$/g,"");
let content;

async function boot(){
  const u=await CogDB.user();
  if(!u&&!CogDB.demo)return auth();
  if(!CogDB.demo&&!(await CogDB.admin()))return denied(u);
  logout.classList.remove("hidden");logout.onclick=async()=>{await CogDB.signOut();location.reload()};
  renderShell();go("experiments");
}
function auth(){
  A.innerHTML=`<section class="card login"><h2>Admin login</h2>
  <p class="muted">ამ გვერდზე მხოლოდ წინასწარ ავტორიზებული ადმინისტრატორები შედიან.</p>
  <div class="field"><label>Email</label><input id="em" type="email"></div>
  <div class="field"><label>Password</label><input id="pw" type="password"></div>
  <div id="err" class="alert danger hidden"></div>
  <button id="authGo" class="btn primary">შესვლა</button></section>`;
  authGo.onclick=async()=>{try{await CogDB.signIn(em.value.trim(),pw.value);location.reload()}catch(e){err.textContent=e.message;err.classList.remove("hidden")}};
}
function denied(u){A.innerHTML=`<section class="card login"><h2>Access denied</h2><p>${esc(u?.email||"")} არ არის ავტორიზებულ Admin სიაში.</p></section>`}
function renderShell(){
  A.innerHTML=`<div class="layout"><aside class="card sidebar">
    <button class="navbtn" data-go="experiments">Experiments</button>
    <button class="navbtn" data-go="new">+ Create experiment</button>
    <button class="navbtn" data-go="results">Results</button>
    <button class="navbtn" data-go="setup">Setup</button>
  </aside><section id="content"></section></div>`;
  content=document.getElementById("content");
  document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
}
function active(name){document.querySelectorAll(".navbtn").forEach(b=>b.classList.toggle("active",b.dataset.go===name))}
async function go(name,arg){active(name==="edit"?"experiments":name);if(name==="experiments")return list();if(name==="new")return builder();if(name==="edit")return builder(arg);if(name==="results")return results();if(name==="setup")return setup()}
async function list(){
  const es=await CogDB.experiments(true);
  content.innerHTML=`<div class="section-head"><div><h2>Experiments</h2><p class="muted">Universal builder — თავისუფალი blocks, timings, responses და uploaded stimuli.</p></div><button id="newBtn" class="btn primary">+ Create experiment</button></div>
  <div class="table-wrap"><table><thead><tr><th>Name</th><th>Blocks</th><th>Status</th><th>Participant link</th><th></th></tr></thead><tbody>
  ${es.map(e=>`<tr><td><b>${esc(e.name)}</b><br><span class="muted">${esc(e.slug)}</span></td><td>${e.config?.blocks?.length||0}</td><td><span class="status ${e.status}">${e.status}</span></td><td>${e.status==="published"?`<a href="run.html?exp=${encodeURIComponent(e.slug)}" target="_blank">Open</a>`:"—"}</td><td><button class="btn small" data-edit="${e.id}">Edit</button> <button class="btn small danger" data-del="${e.id}">Delete</button></td></tr>`).join("")}</tbody></table></div>`;
  newBtn.onclick=()=>go("new");document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>go("edit",b.dataset.edit));
  document.querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{if(confirm("წავშალოთ ექსპერიმენტი?")){await CogDB.deleteExperiment(b.dataset.del);list()}});
}
async function builder(id){
  const es=await CogDB.experiments(true),old=id?es.find(x=>x.id===id):null,cfg=structuredClone(old?.config||{});
  let responses=cfg.responses||[{key:"1",label:"Response 1"},{key:"2",label:"Response 2"},{key:"3",label:"Response 3"}];
  let blocks=cfg.blocks||[{id:uid(),name:"Block 1",trials:10,exposure_ms:1000,isi_ms:1000,break_after_ms:0,save:true,stimuli:[],stop_rule:null}];
  content.innerHTML=`<div class="section-head"><div><h2>${old?"Edit":"Create"} experiment</h2><p class="muted">არ არსებობს წინასწარ განსაზღვრული stimulus type — ექსპერიმენტს შენ აწყობ.</p></div></div>
  <div class="grid two">
   <div class="card"><h3>General</h3>
    <div class="field"><label>Name</label><input id="nm" value="${esc(old?.name||"")}"></div>
    <div class="field"><label>URL slug</label><input id="sl" value="${esc(old?.slug||"")}"></div>
    <div class="field"><label>Description / participant instructions</label><textarea id="ds">${esc(old?.description||"")}</textarea></div>
    <div class="field"><label>Status</label><select id="st"><option value="draft">Draft</option><option value="published" ${old?.status==="published"?"selected":""}>Published</option><option value="archived" ${old?.status==="archived"?"selected":""}>Archived</option></select></div>
   </div>
   <div class="card"><div class="section-head"><h3>Response keys</h3><button id="addR" class="btn small">+ Add</button></div><div id="resp"></div><p class="muted">მაგ.: 1 = მარცხენა დიდია; 2 = ტოლია; 3 = მარჯვენა დიდია — ან ნებისმიერი სხვა mapping.</p></div>
  </div>
  <div class="section-head" style="margin-top:20px"><div><h2>Blocks</h2><p class="muted">Block-ის სახელს, trials-ს, timing-ს და stop rule-ს თავისუფლად ირჩევ.</p></div><button id="addB" class="btn primary">+ Add block</button></div>
  <div id="blocks"></div>
  <div class="row"><button id="save" class="btn primary">Save experiment</button><button id="cancel" class="btn">Cancel</button></div>`;
  nm.oninput=()=>{if(!old&&!sl.value)sl.value=slugify(nm.value)};
  addR.onclick=()=>{responses.push({key:"",label:""});renderResponses()};
  addB.onclick=()=>{blocks.push({id:uid(),name:`Block ${blocks.length+1}`,trials:10,exposure_ms:1000,isi_ms:1000,break_after_ms:0,save:true,stimuli:[],stop_rule:null});renderBlocks()};
  cancel.onclick=()=>go("experiments");

  function renderResponses(){
    resp.innerHTML=responses.map((r,i)=>`<div class="row"><input style="width:90px" data-rk="${i}" value="${esc(r.key)}" placeholder="Key"><input style="flex:1" data-rl="${i}" value="${esc(r.label)}" placeholder="Meaning"><button class="btn small" data-rd="${i}">×</button></div><div class="spacer"></div>`).join("");
    document.querySelectorAll("[data-rk]").forEach(x=>x.oninput=()=>responses[+x.dataset.rk].key=x.value);
    document.querySelectorAll("[data-rl]").forEach(x=>x.oninput=()=>responses[+x.dataset.rl].label=x.value);
    document.querySelectorAll("[data-rd]").forEach(x=>x.onclick=()=>{responses.splice(+x.dataset.rd,1);renderResponses()});
  }
  function renderBlocks(){
    document.getElementById("blocks").innerHTML=blocks.map((b,i)=>`<section class="card block-card">
      <div class="section-head"><h3>${esc(b.name)}</h3><button class="btn small danger" data-bd="${i}">Remove</button></div>
      <div class="inline">
        <div class="field"><label>Block name</label><input data-bi="${i}" data-bk="name" value="${esc(b.name)}"></div>
        <div class="field"><label>Trials</label><input type="number" min="1" data-bi="${i}" data-bk="trials" value="${b.trials}"></div>
        <div class="field"><label>Save data</label><select data-bi="${i}" data-bk="save"><option value="true" ${b.save!==false?"selected":""}>Yes</option><option value="false" ${b.save===false?"selected":""}>No</option></select></div>
      </div>
      <div class="inline">
        <div class="field"><label>Exposure (ms)</label><input type="number" min="0" data-bi="${i}" data-bk="exposure_ms" value="${b.exposure_ms}"></div>
        <div class="field"><label>ISI (ms)</label><input type="number" min="0" data-bi="${i}" data-bk="isi_ms" value="${b.isi_ms}"></div>
        <div class="field"><label>Break after (sec)</label><input type="number" min="0" data-bi="${i}" data-bk="break_sec" value="${(b.break_after_ms||0)/1000}"></div>
      </div>
      <div class="field"><label>Upload stimulus files</label><input type="file" multiple accept="image/*,audio/*,video/*" data-up="${i}"></div>
      <div class="files">${(b.stimuli||[]).map((s,j)=>`${esc(s.name)} <button class="btn small" data-sd="${i}:${j}">remove</button>`).join("<br>")||"No stimuli uploaded"}</div>
      <div class="inline" style="margin-top:14px">
        <div class="field"><label>Stop rule</label><select data-bi="${i}" data-bk="stop_type"><option value="fixed">Fixed N</option><option value="consecutive_response" ${b.stop_rule?.type==="consecutive_response"?"selected":""}>Consecutive same response</option></select></div>
        <div class="field"><label>Response key</label><input data-bi="${i}" data-bk="stop_key" value="${esc(b.stop_rule?.key||"")}"></div>
        <div class="field"><label>Consecutive N</label><input type="number" data-bi="${i}" data-bk="stop_count" value="${b.stop_rule?.count||10}"></div>
      </div>
    </section>`).join("");
    document.querySelectorAll("[data-bi]").forEach(x=>{x.oninput=x.onchange=()=>updateBlock(x)});
    document.querySelectorAll("[data-bd]").forEach(x=>x.onclick=()=>{blocks.splice(+x.dataset.bd,1);renderBlocks()});
    document.querySelectorAll("[data-sd]").forEach(x=>x.onclick=()=>{const [i,j]=x.dataset.sd.split(":").map(Number);blocks[i].stimuli.splice(j,1);renderBlocks()});
    document.querySelectorAll("[data-up]").forEach(x=>x.onchange=async()=>{const i=+x.dataset.up;x.disabled=true;try{for(const f of x.files){blocks[i].stimuli.push(await CogDB.uploadStimulus(f))}}catch(e){alert(e.message)}finally{x.disabled=false;renderBlocks()}});
  }
  function updateBlock(x){
    const b=blocks[+x.dataset.bi],k=x.dataset.bk,v=x.value;
    if(["trials","exposure_ms","isi_ms"].includes(k))b[k]=+v;
    else if(k==="break_sec")b.break_after_ms=+v*1000;
    else if(k==="save")b.save=v==="true";
    else if(k==="stop_type")b.stop_rule=v==="consecutive_response"?{type:v,key:b.stop_rule?.key||"",count:b.stop_rule?.count||10}:null;
    else if(k==="stop_key"){b.stop_rule=b.stop_rule||{type:"consecutive_response",count:10};b.stop_rule.key=v}
    else if(k==="stop_count"){b.stop_rule=b.stop_rule||{type:"consecutive_response",key:""};b.stop_rule.count=+v}
    else b[k]=v;
  }
  renderResponses();renderBlocks();
  save.onclick=async()=>{if(!nm.value.trim()||!sl.value.trim())return alert("Name და URL slug აუცილებელია.");if(!blocks.length)return alert("მინიმუმ ერთი block დაამატე.");await CogDB.saveExperiment({id:old?.id||uid(),name:nm.value.trim(),slug:sl.value.trim(),description:ds.value.trim(),status:st.value,version:old?.version||1,config:{builder_version:4,responses,blocks}});go("experiments")};
}
async function results(){
  const es=await CogDB.experiments(true);
  content.innerHTML=`<div class="section-head"><div><h2>Results</h2><p class="muted">ერთი participant = ერთი row; თითო block-ზე 1/2/3 counts, percentages და sequences.</p></div><button id="download" class="btn primary">Download Excel</button></div>
  <div class="field" style="max-width:420px"><label>Experiment</label><select id="filter"><option value="">All</option>${es.map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join("")}</select></div><div id="stats"></div>`;
  filter.onchange=load;download.onclick=exportXlsx;await load();
  async function load(){const d=await CogDB.results(filter.value);stats.innerHTML=`<div class="grid three"><div class="card kpi"><div class="n">${d.sessions.length}</div><div class="l">Sessions</div></div><div class="card kpi"><div class="n">${d.sessions.filter(s=>s.completed_at).length}</div><div class="l">Completed</div></div><div class="card kpi"><div class="n">${d.trials.length}</div><div class="l">Trials</div></div></div>`}
  async function exportXlsx(){
    const d=await CogDB.results(filter.value),expMap=Object.fromEntries(es.map(e=>[e.id,e])),g={};d.trials.forEach(t=>(g[t.session_id]??=[]).push(t));
    const summary=d.sessions.map(s=>{const ts=(g[s.id]||[]).sort((a,b)=>(a.global_trial||0)-(b.global_trial||0)),r={Participant:s.participant_code,Experiment:expMap[s.experiment_id]?.name||s.experiment_id,Started:s.created_at,Completed:s.completed_at||"",Validity:s.validity_status||""};[...new Set(ts.map(t=>t.block_name))].forEach(b=>{const bt=ts.filter(t=>t.block_name===b),answered=bt.filter(t=>t.response_key);r[`${b} N`]=bt.length;["1","2","3"].forEach(k=>{const n=answered.filter(t=>t.response_key===k).length;r[`${b} ${k}`]=n;r[`${b} ${k} %`]=answered.length?+(n*100/answered.length).toFixed(1):0});r[`${b} sequence`]=bt.map(t=>t.response_key||"NA").join(",");r[`${b} missing`]=bt.filter(t=>t.missing).length});return r});
    const raw=d.trials.map(t=>({Participant:t.participant_code,Experiment:expMap[t.experiment_id]?.name||t.experiment_id,Block:t.block_name,Trial:t.block_trial,Global_Trial:t.global_trial,Stimulus:t.stimulus_name||"",Stimulus_Type:t.stimulus_type||"",Response_Key:t.response_key||"",Response_Label:t.response_label||"",RT_ms:t.rt_ms??"",Missing:t.missing,Timestamp:t.created_at}));
    const settings=es.map(e=>({Experiment:e.name,Slug:e.slug,Status:e.status,Blocks:(e.config?.blocks||[]).map(b=>b.name).join(" | "),Responses:(e.config?.responses||[]).map(r=>`${r.key}=${r.label}`).join(" | ")}));
    const wb=XLSX.utils.book_new();for(const [name,data] of [["Participants",summary],["Trial_Data",raw],["Experiment_Settings",settings]]){const ws=XLSX.utils.json_to_sheet(data);ws["!autofilter"]={ref:ws["!ref"]||"A1:A1"};ws["!cols"]=Array.from({length:50},()=>({wch:18}));XLSX.utils.book_append_sheet(wb,ws,name)}XLSX.writeFile(wb,`cogexperiments-${new Date().toISOString().slice(0,10)}.xlsx`);
  }
}
function setup(){content.innerHTML=`<h2>Setup</h2><section class="card"><h3>${CogDB.demo?"Demo Mode":"Supabase connected"}</h3><p class="muted">Build: ${esc(COG_CONFIG.BUILD)}</p><p>${CogDB.demo?"Production-ისთვის Supabase URL + publishable key ჩაწერე assets/config.js-ში და DEMO_MODE=false გააკეთე.":"მონაცემები Supabase-ში ინახება."}</p><p><b>Admin registration is intentionally disabled.</b> ახალი Admin იქმნება მხოლოდ Supabase-იდან და შემდეგ ემატება admin_users ცხრილში.</p></section>`}
boot().catch(e=>A.innerHTML=`<div class="alert danger">${esc(e.message)}</div>`);
})();