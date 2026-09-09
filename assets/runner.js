(() => {
  const app = document.getElementById('runner');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = t => esc(t).replace(/\n/g, '<br>');
  const show = h => app.innerHTML = `<div class="runner-shell"><section class="runner-card">${h}</section></div>`;
  const waitButton = (id='next') => new Promise(r => document.getElementById(id).onclick = r);

  let exp, cfg, session;
  let pxPerMm = null, globalTrial = 0, trialRows = [];
  let controlResponses = [], setSide = '', criticalEndedByStreak = false;
  let completedFixedStages = new Set(), calibrationViewport = null;
  let resizeBound = false;
  const blockPlans = new Map();
  const adaptiveState = { controlResponses: [], asymmetry: 'none', setVariant: null };

  async function boot(){
    const slug = new URLSearchParams(location.search).get('exp');
    if(!slug) return show('<h2>Experiment link incomplete</h2>');
    exp = await CogDB.experimentBySlug(slug);
    if(!exp) return show('<h2>Experiment unavailable</h2>');
    cfg = exp.config || {};
    show(`<h2>${esc(exp.name)}</h2><div class="field"><label>Participant code</label><input id="pc" autocomplete="off"></div><button id="start" class="btn primary">დაწყება</button>`);
    start.onclick = async () => {
      if(!pc.value.trim()) return;
      exp = await CogDB.experimentBySlug(slug);
      cfg = exp.config || {};
      session = await CogDB.createSession({
        experiment_id: exp.id,
        experiment_version: exp.version,
        participant_code: pc.value.trim(),
        device_type: /Mobi/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        summary: {}
      });
      if(cfg.calibration?.enabled) await calibrate();
      await runTimeline();
    };
  }

  async function calibrate(){
    let width = 320;
    show(`<h2>ეკრანის კალიბრაცია</h2>
      <p>მოათავსეთ სტანდარტული საბანკო/ID ბარათი ეკრანთან და შეცვალეთ მართკუთხედის სიგანე, სანამ ზუსტად დაემთხვევა ბარათის <b>85.60 mm</b> სიგანეს.</p>
      <div class="calibration-wrap"><div id="cardRef" class="card-reference" style="width:${width}px"></div></div>
      <div class="row calibration-controls"><button id="minus" class="btn">−</button><input id="range" type="range" min="160" max="700" value="${width}"><button id="plus" class="btn">+</button></div>
      <p><span id="pxv">${width}</span> px</p>
      <button id="calok" class="btn primary">დამთხვევა ზუსტია — გაგრძელება</button>`);
    const ref = cardRef;
    const set = v => {
      width = Math.max(160, Math.min(700, +v));
      range.value = width;
      ref.style.width = width + 'px';
      pxv.textContent = width;
    };
    range.oninput = () => set(range.value);
    minus.onclick = () => set(width - 2);
    plus.onclick = () => set(width + 2);
    await waitButton('calok');
    pxPerMm = width / 85.60;
    calibrationViewport = {w: innerWidth, h: innerHeight, orientation: screen.orientation?.type || ''};
    if(!resizeBound){
      resizeBound = true;
      addEventListener('resize', () => {
        if(!calibrationViewport) return;
        const changed = Math.abs(innerWidth-calibrationViewport.w)>30 || Math.abs(innerHeight-calibrationViewport.h)>30;
        if(changed) calibrationViewport = null;
      }, {passive:true});
    }
    validatePhysicalFit();
  }

  function validatePhysicalFit(){
    if(!pxPerMm) return;
    let maxWidthMm = 0, maxHeightMm = 0;
    if(cfg.template === 'uznadze_fixed_set'){
      const f = cfg.fixed_set || {};
      maxWidthMm = (f.large_mm||80)*2 + (f.pair_gap_mm||15)*2;
      maxHeightMm = f.large_mm || 80;
    }
    for(const b of (cfg.elements||[]).filter(e=>e.type==='block')){
      for(const s of b.stimuli||[]){
        const dims = intendedCanvasMm(s);
        maxWidthMm = Math.max(maxWidthMm, dims.w || 0);
        maxHeightMm = Math.max(maxHeightMm, dims.h || 0);
      }
    }
    if(maxWidthMm*pxPerMm > innerWidth*0.94 || maxHeightMm*pxPerMm > innerHeight*0.82){
      throw Error('ამ მოწყობილობაზე ექსპერიმენტის ერთ-ერთი დაკალიბრებული stimulus სრულ ზომაზე ვერ ეტევა. stimulus არ დაპატარავებულა — გამოიყენეთ უფრო დიდი ეკრანი ან შეცვალეთ ექსპერიმენტის პარამეტრები.');
    }
  }

  async function ensureCalibration(){
    if(cfg.calibration?.enabled && !calibrationViewport) await calibrate();
  }

  async function runTimeline(){
    const tl = structuredClone(cfg.elements || []);
    if(cfg.template === 'uznadze_fixed_set'){
      const s = tl.findIndex(e=>e.type==='fixedset_stage'&&e.stage==='set');
      const c = tl.findIndex(e=>e.type==='fixedset_stage'&&e.stage==='critical');
      if(s < 0 || c !== s+1) throw Error('Fixed Set requires immediate Set → Critical.');
    }
    for(const el of tl){
      await ensureCalibration();
      if(el.type==='instruction') await instruction(el);
      else if(el.type==='break') await pause(el);
      else if(el.type==='fixedset_stage'){
        if(!completedFixedStages.has(el.stage)){
          await fixedStage(el.stage);
          completedFixedStages.add(el.stage);
        }
      } else if(el.type==='block') await genericBlock(el);
    }
    const summary = buildSummary();
    await CogDB.finishSession(session.id, summary);
    show(`<h2>ექსპერიმენტი დასრულდა</h2><p>${esc(cfg.completion_message||'გმადლობთ მონაწილეობისთვის.')}</p>`);
  }

  async function instruction(el){
    show(`<h2>${esc(el.title||'ინსტრუქცია')}</h2><div class="instruction-text">${fmt(el.text||'')}</div><button id="next" class="btn primary">${esc(el.button_text||'გაგრძელება')}</button>`);
    await waitButton();
  }

  async function pause(el){
    const ms = Math.max(0, +el.duration_ms||0), end = Date.now()+ms;
    show(`<h2>${esc(el.title||'შუალედი')}</h2><div class="instruction-text">${fmt(el.text||'')}</div>${ms?'<div id="clock" class="countdown"></div>':''}<button id="resume" class="btn primary" ${ms?'disabled':''}>${esc(el.button_text||'გაგრძელება')}</button>`);
    if(ms) await new Promise(res => {
      const tick = () => {
        const s = Math.ceil(Math.max(0,end-Date.now())/1000);
        clock.textContent = `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
        if(s<=0){ resume.disabled=false; return res(); }
        setTimeout(tick,250);
      };
      tick();
    });
    await waitButton('resume');
  }

  function seedFrom(text){
    let h = 2166136261 >>> 0;
    for(const ch of String(text)){ h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function mulberry32(seed){ return () => { let t=seed+=0x6D2B79F5; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }; }
  function shuffle(a, rnd=Math.random){
    a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a;
  }
  function balancedPseudoIndices(nStim, nSlots, seed){
    if(nStim<=1) return Array(nSlots).fill(0);
    const rnd=mulberry32(seed);
    const counts=Array(nStim).fill(Math.floor(nSlots/nStim));
    for(let i=0;i<nSlots%nStim;i++) counts[i]++;
    const base=[]; counts.forEach((c,idx)=>{for(let k=0;k<c;k++)base.push(idx)});
    for(let attempt=0;attempt<300;attempt++){
      const x=shuffle(base,rnd); let ok=true;
      for(let i=2;i<x.length;i++) if(x[i]===x[i-1]&&x[i]===x[i-2]){ok=false;break;}
      if(ok) return x;
    }
    const out=[], rem=counts.slice();
    while(out.length<nSlots){
      let opts=rem.map((c,i)=>({c,i})).filter(o=>o.c>0 && !(out.length>=2&&out.at(-1)===o.i&&out.at(-2)===o.i));
      if(!opts.length) opts=rem.map((c,i)=>({c,i})).filter(o=>o.c>0);
      opts.sort((a,b)=>b.c-a.c || rnd()-.5);
      const pick=opts[0].i; out.push(pick); rem[pick]--;
    }
    return out;
  }

  function planForBlock(b){
    if(blockPlans.has(b.id)) return blockPlans.get(b.id);
    const nStim=(b.stimuli||[]).length, trials=Math.max(1,+b.trials||1), slots=b.presentation==='pair'?trials*2:trials;
    let idx=[];
    if(b.stimulus_order==='pseudorandom') idx=balancedPseudoIndices(nStim,slots,seedFrom(`${session.participant_code}|${exp.id}|${b.id||b.name}`));
    else if(b.stimulus_order==='random') idx=Array.from({length:slots},()=>Math.floor(Math.random()*Math.max(1,nStim)));
    else idx=Array.from({length:slots},(_,i)=>nStim?i%nStim:0);
    blockPlans.set(b.id,{indices:idx}); return blockPlans.get(b.id);
  }

  function adaptiveDirectionKeys(b){
    const r=cfg.responses||[];
    return {
      a:b.adaptive_direction_a_key || r[0]?.key || '1',
      equal:b.adaptive_equal_key || r[1]?.key || '2',
      b:b.adaptive_direction_b_key || r[2]?.key || '3'
    };
  }
  function determineGenericSetVariant(b){
    const keys=adaptiveDirectionKeys(b), bad=adaptiveState.controlResponses.filter(k=>k===keys.a||k===keys.b);
    const a=bad.filter(k=>k===keys.a).length, bb=bad.filter(k=>k===keys.b).length, th=+b.adaptive_threshold||.70;
    if(bad.length && a/bad.length>th){ adaptiveState.asymmetry='A'; return 0; }
    if(bad.length && bb/bad.length>th){ adaptiveState.asymmetry='B'; return 1; }
    adaptiveState.asymmetry='none';
    return seedFrom(`${session.participant_code}|${exp.id}|adaptive-set`) % 2;
  }

  async function genericBlock(b){
    if(b.show_instructions && b.instructions) await instruction({title:b.name,text:b.instructions,button_text:'დაწყება'});
    if(b.adaptive_role==='control') adaptiveState.controlResponses=[];
    if(b.adaptive_role==='set') adaptiveState.setVariant=determineGenericSetVariant(b);
    let streak = 0;
    for(let i=1; i<=Math.max(1,+b.trials||1); i++){
      await ensureCalibration();
      const r = await genericTrial(b,i);
      if(b.adaptive_role==='control') adaptiveState.controlResponses.push(r.response_key);
      if(b.stop_rule?.type==='consecutive_response'){
        streak = r.response_key===b.stop_rule.key ? streak+1 : 0;
        if(streak>=+b.stop_rule.count) break;
      }
    }
  }

  function chooseStimuli(b,i){
    const a = b.stimuli || [];
    if(!a.length) return [];
    if(b.adaptive_role==='set' && a.length>=2){
      const chosen=a[adaptiveState.setVariant===1?1:0];
      return b.presentation==='pair'?[chosen,chosen]:[chosen];
    }
    const plan=planForBlock(b), offset=b.presentation==='pair'?(i-1)*2:(i-1);
    if(b.presentation==='pair') return [a[plan.indices[offset]%a.length],a[plan.indices[offset+1]%a.length]];
    return [a[plan.indices[offset]%a.length]];
  }

  function intendedCanvasMm(s){
    if(!s || !(s.type||'').startsWith('image/')) return {w:+s?.width_mm||0,h:+s?.height_mm||0};
    if(s.scale_mode==='reference_box'){
      const box = s.reference_box || {};
      const rw = Math.max(.1,+box.w_pct||100)/100;
      const rh = Math.max(.1,+box.h_pct||100)/100;
      const tw = +s.reference_width_mm||0;
      const th = +s.reference_height_mm||0;
      if(tw>0) return {w:tw/rw,h:0};
      if(th>0) return {w:0,h:th/rh};
    }
    return {w:+s.width_mm||0,h:+s.height_mm||0};
  }

  function imageAttrs(s){
    const mode = s.scale_mode || 'canvas';
    if(mode==='reference_box'){
      const b = s.reference_box || {x_pct:0,y_pct:0,w_pct:100,h_pct:100};
      const rw = Math.max(.1,+b.w_pct||100)/100;
      const rh = Math.max(.1,+b.h_pct||100)/100;
      const tw = +s.reference_width_mm||0;
      const th = +s.reference_height_mm||0;
      let style = 'max-width:none;max-height:none;';
      if(tw>0) style += `width:${(tw/rw*pxPerMm).toFixed(2)}px;height:auto;`;
      else if(th>0) style += `height:${(th/rh*pxPerMm).toFixed(2)}px;width:auto;`;
      return {style, mode, reference_box:b, reference_width_mm:tw||null, reference_height_mm:th||null};
    }
    let style = 'max-width:none;max-height:none;';
    if(+s.width_mm>0) style += `width:${(+s.width_mm*pxPerMm).toFixed(2)}px;`;
    if(+s.height_mm>0) style += `height:${(+s.height_mm*pxPerMm).toFixed(2)}px;`;
    if(s.lock_aspect!==false){
      if(+s.width_mm>0 && !(+s.height_mm>0)) style += 'height:auto;';
      if(+s.height_mm>0 && !(+s.width_mm>0)) style += 'width:auto;';
    }
    return {style, mode, width_mm:+s.width_mm||null, height_mm:+s.height_mm||null};
  }

  function assetHTML(s, cls=''){
    if(!s) return '';
    if((s.type||'').startsWith('image/')){
      const a=imageAttrs(s);
      return `<img class="${cls}" src="${s.url}" alt="" style="${a.style}">`;
    }
    if((s.type||'').startsWith('video/')) return `<video class="${cls}" data-media src="${s.url}" preload="auto" playsinline></video>`;
    if((s.type||'').startsWith('audio/')) return `<audio data-media src="${s.url}" preload="auto"></audio>`;
    return `<span>${esc(s.name||'Stimulus')}</span>`;
  }

  function fixationHTML(b){
    const f = b.fixation || {mode:'red_dot',size_mm:4};
    if(f.mode==='none') return '';
    if(f.mode==='uploaded' && f.asset){
      const mm = +f.size_mm||4;
      const style = pxPerMm ? `width:${(mm*pxPerMm).toFixed(2)}px;height:auto;max-width:none;max-height:none;` : '';
      return `<img class="fixation-image" src="${f.asset.url}" alt="" style="${style}">`;
    }
    const mm = +f.size_mm||4;
    const px = Math.max(3, mm*(pxPerMm||96/25.4));
    return `<div class="fixation" style="width:${px}px;height:${px}px"></div>`;
  }

  function stimulusStageHTML(b,ss){
    const fix = fixationHTML(b);
    if(b.presentation==='pair'){
      const gap = (+b.pair_gap_mm||15)*(pxPerMm||96/25.4);
      return `<div class="uploaded-pair" style="gap:${gap}px"><div>${assetHTML(ss[0])}</div><div>${fix}</div><div>${assetHTML(ss[1])}</div></div>`;
    }
    return `<div class="scene-wrap">${assetHTML(ss[0])}${fix?`<div class="scene-fixation">${fix}</div>`:''}</div>`;
  }

  async function genericTrial(b,i){
    const ss = chooseStimuli(b,i);
    app.innerHTML = `<section class="experiment-screen"><div id="stage" class="stimulus-stage">${stimulusStageHTML(b,ss)}</div><div class="response-bar">${buttons()}</div></section>`;
    const windowType = b.response_window || 'until_next_stimulus';
    const windowMs = windowType==='custom_ms' ? Math.max(0,+b.response_window_ms||0) : null;
    return captureTrial({
      block_name:b.name,
      block_trial:i,
      stimulus_name:ss.map(s=>s?.name||'').join(' | '),
      stimulus_type:ss.map(s=>s?.type||'').join(' | '),
      exposure_ms:+b.exposure_ms||1000,
      isi_ms:+b.isi_ms||0,
      response_window:windowType,
      response_window_ms:windowMs,
      save:b.save!==false,
      fixation_html:fixationHTML(b),
      metadata:{
        presentation:b.presentation||'single',
        stimulus_order:b.stimulus_order||'sequential',
        adaptive_role:b.adaptive_role||'none',
        adaptive_asymmetry:adaptiveState.asymmetry,
        adaptive_set_variant:adaptiveState.setVariant,
        stimuli:ss.map(s=>({name:s?.name,scale_mode:s?.scale_mode||'canvas',width_mm:s?.width_mm,height_mm:s?.height_mm,reference_box:s?.reference_box,reference_width_mm:s?.reference_width_mm,reference_height_mm:s?.reference_height_mm})),
        fixation:{mode:b.fixation?.mode||'red_dot',size_mm:+b.fixation?.size_mm||4,name:b.fixation?.asset?.name||null},
        px_per_mm:pxPerMm
      }
    });
  }

  const buttons = () => (cfg.responses||[]).map(r=>`<button data-k="${esc(r.key)}">${esc(r.key)} — ${esc(r.label)}</button>`).join('');

  async function fixedStage(stage){
    const f=cfg.fixed_set||{};
    if(stage==='practice') for(let i=1;i<=Math.min(3,+f.practice_trials||3);i++) await circleTrial('Practice',i,f.equal_mm,f.equal_mm,false,{stage});
    if(stage==='control'){
      controlResponses=[];
      for(let i=1;i<=+f.control_trials;i++){
        const r=await circleTrial('Control',i,f.equal_mm,f.equal_mm,true,{stage});
        controlResponses.push(r.response_key);
      }
    }
    if(stage==='set'){
      setSide=determineSetSide();
      for(let i=1;i<=+f.set_trials;i++) await circleTrial('Set / Induction',i,setSide==='left'?f.large_mm:f.small_mm,setSide==='right'?f.large_mm:f.small_mm,true,{stage,set_side:setSide});
    }
    if(stage==='critical'){
      let streak=0; criticalEndedByStreak=false;
      for(let i=1;i<=+f.critical_max_trials;i++){
        const r=await circleTrial('Critical',i,f.equal_mm,f.equal_mm,true,{stage,set_side:setSide});
        streak=r.response_key===f.critical_stop_key?streak+1:0;
        if(streak>=+f.critical_stop_count){criticalEndedByStreak=true;break;}
      }
    }
  }

  function determineSetSide(){
    const f=cfg.fixed_set||{}, bad=controlResponses.filter(k=>k==='1'||k==='3'), l=bad.filter(k=>k==='1').length, r=bad.filter(k=>k==='3').length;
    if(bad.length&&l/bad.length>f.natural_asymmetry_threshold) return 'left';
    if(bad.length&&r/bad.length>f.natural_asymmetry_threshold) return 'right';
    return seedFrom(`${session.participant_code}|${exp.id}|fixed-set`)%2?'right':'left';
  }

  async function circleTrial(name,i,lmm,rmm,save,metadata){
    await ensureCalibration();
    const p=pxPerMm||96/25.4, g=(cfg.fixed_set?.pair_gap_mm||15)*p, fix=Math.max(3,(cfg.fixed_set?.fixation_mm||3)*p);
    const fixHtml=`<div class="fixation" style="width:${fix}px;height:${fix}px"></div>`;
    app.innerHTML=`<section class="experiment-screen fixedset-screen"><div id="stage" class="stimulus-stage"><div class="uploaded-pair" style="gap:${g}px"><div class="circle-stim" style="width:${lmm*p}px;height:${lmm*p}px"></div><div>${fixHtml}</div><div class="circle-stim" style="width:${rmm*p}px;height:${rmm*p}px"></div></div></div><div class="response-bar">${buttons()}</div></section>`;
    return captureTrial({
      block_name:name,block_trial:i,stimulus_name:`circle_pair_${lmm}mm_${rmm}mm`,stimulus_type:'generated/circles',
      exposure_ms:+cfg.fixed_set.exposure_ms,isi_ms:+cfg.fixed_set.isi_ms,response_window:'until_next_stimulus',save,
      fixation_html:fixHtml,
      metadata:{...metadata,left_mm:lmm,right_mm:rmm,px_per_mm:pxPerMm}
    });
  }

  async function prepareMedia(configuredExposure){
    const media=[...document.querySelectorAll('[data-media]')];
    if(!media.length) return {exposure_ms:configuredExposure,media_durations_ms:[]};
    await Promise.all(media.map(m=>new Promise(resolve=>{
      if(m.readyState>=1) return resolve();
      const done=()=>{m.removeEventListener('loadedmetadata',done);m.removeEventListener('error',done);resolve();};
      m.addEventListener('loadedmetadata',done,{once:true});m.addEventListener('error',done,{once:true});
      setTimeout(done,2500);
      try{m.load?.()}catch{}
    })));
    const durations=media.map(m=>Number.isFinite(m.duration)&&m.duration>0?m.duration*1000:0);
    const exposure=Math.max(configuredExposure,...durations);
    for(const m of media){try{m.pause();m.currentTime=0}catch{}}
    await Promise.all(media.map(async m=>{try{await m.play()}catch(e){console.warn('Media playback could not start automatically',e)}}));
    return {exposure_ms:exposure,media_durations_ms:durations};
  }

  async function captureTrial(s){
    const configuredExposure=Math.max(0,+s.exposure_ms||0);
    const mediaInfo=await prepareMedia(configuredExposure);
    const onset=performance.now(), valid=new Set((cfg.responses||[]).map(r=>r.key));
    let key='', rt=null, open=true;
    const extra=[];
    return new Promise(resolve=>{
      const take=(k,source='keyboard')=>{
        if(!open || !valid.has(k)) return;
        const now=performance.now()-onset;
        if(!key){ key=k; rt=now; }
        else extra.push({key:k,rt_ms:+now.toFixed(2),source});
      };
      const kh=e=>{ if(valid.has(e.key)){ e.preventDefault(); take(e.key,'keyboard'); } };
      addEventListener('keydown',kh,{passive:false});
      document.querySelectorAll('[data-k]').forEach(b=>b.onpointerdown=()=>take(b.dataset.k,'button'));
      const exposure=mediaInfo.exposure_ms, isi=Math.max(0,+s.isi_ms||0);
      let windowMs;
      if(s.response_window==='exposure_only') windowMs=exposure;
      else if(s.response_window==='custom_ms') windowMs=Math.max(0,+s.response_window_ms||0);
      else windowMs=exposure+isi;
      const trialEndMs=Math.max(windowMs, exposure);

      setTimeout(()=>{
        document.querySelectorAll('[data-media]').forEach(m=>{try{m.pause?.()}catch{}});
        const stage=document.getElementById('stage');
        if(stage) stage.innerHTML=s.fixation_html?`<div class="isi-fixation">${s.fixation_html}</div>`:'';
        if(s.response_window==='exposure_only') open=false;
      }, exposure);

      setTimeout(async()=>{
        open=false; removeEventListener('keydown',kh); globalTrial++;
        const missing=!key;
        const row={
          experiment_id:exp.id,experiment_version:exp.version,session_id:session.id,participant_code:session.participant_code,
          block_name:s.block_name,global_trial:globalTrial,block_trial:s.block_trial,stimulus_name:s.stimulus_name,stimulus_type:s.stimulus_type,
          response_key:key,response_label:(cfg.responses||[]).find(r=>r.key===key)?.label||'',rt_ms:rt==null?null:+rt.toFixed(2),missing,
          metadata:{...(s.metadata||{}),configured_exposure_ms:configuredExposure,effective_exposure_ms:exposure,media_durations_ms:mediaInfo.media_durations_ms,response_window:s.response_window,response_window_ms:windowMs,response_during:rt==null?'missing':(rt<=exposure?'exposure':'isi'),extra_keypress_count:extra.length,extra_keypresses:extra}
        };
        trialRows.push(row); if(s.save) await CogDB.insertTrial(row); resolve(row);
      }, trialEndMs);
    });
  }

  function buildSummary(){
    if(cfg.template==='uznadze_fixed_set'){
      const bad=controlResponses.filter(k=>k==='1'||k==='3'), l=bad.filter(k=>k==='1').length, r=bad.filter(k=>k==='3').length;
      let asym='none';
      if(bad.length&&l/bad.length>(cfg.fixed_set?.natural_asymmetry_threshold||.7)) asym='left';
      if(bad.length&&r/bad.length>(cfg.fixed_set?.natural_asymmetry_threshold||.7)) asym='right';
      const c=trialRows.filter(x=>x.block_name==='Control'), k=trialRows.filter(x=>x.block_name==='Critical');
      const cm=c.length?c.filter(x=>x.missing).length/c.length:0, km=k.length?k.filter(x=>x.missing).length/k.length:0;
      return {
        validity_status:cm>.2||km>.2?'invalid_missing_gt_20pct':'valid',set_side:setSide,natural_asymmetry:asym,
        control_missing_rate:cm,critical_missing_rate:km,critical_contrast_count:k.filter(x=>x.response_key===(setSide==='left'?'3':'1')).length,
        extinguished:criticalEndedByStreak,critical_trials:k.length,calibration_px_per_mm:pxPerMm
      };
    }
    const blocks=cfg.elements?.filter(e=>e.type==='block')||[];
    const control=blocks.find(b=>b.adaptive_role==='control'), critical=blocks.find(b=>b.adaptive_role==='critical');
    const c=control?trialRows.filter(x=>x.block_name===control.name):[], k=critical?trialRows.filter(x=>x.block_name===critical.name):[];
    const cm=c.length?c.filter(x=>x.missing).length/c.length:0, km=k.length?k.filter(x=>x.missing).length/k.length:0;
    const ck=critical?adaptiveDirectionKeys(critical):{a:'1',equal:'2',b:'3'};
    const contrastKey=adaptiveState.setVariant===0?ck.b:(adaptiveState.setVariant===1?ck.a:null);
    const stopCount=critical?.stop_rule?.type==='consecutive_response'?+critical.stop_rule.count:0;
    let endStreak=0; for(const t of k){endStreak=t.response_key===critical?.stop_rule?.key?endStreak+1:0;}
    return {
      validity_status:(control&&cm>.2)||(critical&&km>.2)?'invalid_missing_gt_20pct':'valid',
      natural_asymmetry:adaptiveState.asymmetry,
      set_variant:adaptiveState.setVariant==null?'':(adaptiveState.setVariant===0?'A':'B'),
      control_missing_rate:control?cm:null,
      critical_missing_rate:critical?km:null,
      critical_contrast_count:contrastKey?k.filter(x=>x.response_key===contrastKey).length:null,
      extinguished:!!(stopCount&&endStreak>=stopCount),
      critical_trials:critical?k.length:null,
      calibration_px_per_mm:pxPerMm
    };
  }

  boot().catch(e=>{ console.error(e); show(`<h2>Error</h2><p>${esc(e.message)}</p>`); });
})();
