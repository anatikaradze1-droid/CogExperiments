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

  async function boot(){
    const slug = new URLSearchParams(location.search).get('exp');
    if(!slug) return show('<h2>Experiment link incomplete</h2>');
    exp = await CogDB.experimentBySlug(slug);
    if(!exp) return show('<h2>Experiment unavailable</h2>');
    cfg = exp.config || {};
    show(`<h2>${esc(exp.name)}</h2><div class="field"><label>Participant code</label><input id="pc" autocomplete="off"></div><button id="start" class="btn primary">დაწყება</button>`);
    start.onclick = async () => {
      if(!pc.value.trim()) return;
      // always refresh latest published version immediately before starting
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

  async function genericBlock(b){
    if(b.show_instructions && b.instructions) await instruction({title:b.name,text:b.instructions,button_text:'დაწყება'});
    let streak = 0;
    for(let i=1; i<=Math.max(1,+b.trials||1); i++){
      await ensureCalibration();
      const r = await genericTrial(b,i);
      if(b.stop_rule?.type==='consecutive_response'){
        streak = r.response_key===b.stop_rule.key ? streak+1 : 0;
        if(streak>=+b.stop_rule.count) break;
      }
    }
  }

  function chooseStimuli(b,i){
    const a = b.stimuli || [];
    if(!a.length) return [];
    if(b.presentation==='pair'){
      if(b.stimulus_order==='random') return [a[Math.floor(Math.random()*a.length)],a[Math.floor(Math.random()*a.length)]];
      return [a[((i-1)*2)%a.length], a[((i-1)*2+1)%a.length]];
    }
    return [b.stimulus_order==='random' ? a[Math.floor(Math.random()*a.length)] : a[(i-1)%a.length]];
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
    if((s.type||'').startsWith('video/')) return `<video class="${cls}" data-media src="${s.url}" autoplay playsinline></video>`;
    if((s.type||'').startsWith('audio/')) return `<audio data-media src="${s.url}" autoplay></audio>`;
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
    // single/scene image is centered; fixation is overlaid at exact screen center
    return `<div class="scene-wrap">${assetHTML(ss[0])}<div class="scene-fixation">${fix}</div></div>`;
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
    let h=0; for(const ch of String(session.participant_code)) h=(h*31+ch.charCodeAt(0))>>>0;
    return h%2?'right':'left';
  }

  async function circleTrial(name,i,lmm,rmm,save,metadata){
    await ensureCalibration();
    const p=pxPerMm||96/25.4, g=(cfg.fixed_set?.pair_gap_mm||15)*p, fix=Math.max(3,(cfg.fixed_set?.fixation_mm||4)*p);
    app.innerHTML=`<section class="experiment-screen fixedset-screen"><div id="stage" class="stimulus-stage"><div class="uploaded-pair" style="gap:${g}px"><div class="circle-stim" style="width:${lmm*p}px;height:${lmm*p}px"></div><div class="fixation" style="width:${fix}px;height:${fix}px"></div><div class="circle-stim" style="width:${rmm*p}px;height:${rmm*p}px"></div></div></div><div class="response-bar">${buttons()}</div></section>`;
    return captureTrial({
      block_name:name,block_trial:i,stimulus_name:`circle_pair_${lmm}mm_${rmm}mm`,stimulus_type:'generated/circles',
      exposure_ms:+cfg.fixed_set.exposure_ms,isi_ms:+cfg.fixed_set.isi_ms,response_window:'until_next_stimulus',save,
      fixation_html:`<div class="fixation" style="width:${fix}px;height:${fix}px"></div>`,
      metadata:{...metadata,left_mm:lmm,right_mm:rmm,px_per_mm:pxPerMm}
    });
  }

  function captureTrial(s){
    const onset=performance.now(), valid=new Set((cfg.responses||[]).map(r=>r.key));
    let key='', rt=null, open=true;
    return new Promise(resolve=>{
      const take=k=>{ if(open&&!key&&valid.has(k)){ key=k; rt=performance.now()-onset; } };
      const kh=e=>{ if(valid.has(e.key)){ e.preventDefault(); take(e.key); } };
      addEventListener('keydown',kh,{passive:false});
      document.querySelectorAll('[data-k]').forEach(b=>b.onpointerdown=()=>take(b.dataset.k));
      const exposure=Math.max(0,+s.exposure_ms||0), isi=Math.max(0,+s.isi_ms||0);
      let windowMs;
      if(s.response_window==='exposure_only') windowMs=exposure;
      else if(s.response_window==='custom_ms') windowMs=Math.max(0,+s.response_window_ms||0);
      else windowMs=exposure+isi;
      const trialEndMs=Math.max(windowMs, exposure);

      setTimeout(()=>{
        const stage=document.getElementById('stage');
        if(stage) stage.innerHTML=`<div class="isi-fixation">${s.fixation_html||'<div class="fixation"></div>'}</div>`;
        document.querySelectorAll('[data-media]').forEach(m=>m.pause?.());
        if(s.response_window==='exposure_only') open=false;
      }, exposure);

      setTimeout(async()=>{
        open=false; removeEventListener('keydown',kh); globalTrial++;
        const row={
          experiment_id:exp.id,experiment_version:exp.version,session_id:session.id,participant_code:session.participant_code,
          block_name:s.block_name,global_trial:globalTrial,block_trial:s.block_trial,stimulus_name:s.stimulus_name,stimulus_type:s.stimulus_type,
          response_key:key,response_label:(cfg.responses||[]).find(r=>r.key===key)?.label||'',rt_ms:rt==null?null:+rt.toFixed(2),missing:!key,
          metadata:{...(s.metadata||{}),response_window:s.response_window,response_window_ms:windowMs,response_during:rt==null?'missing':(rt<=exposure?'exposure':'isi')}
        };
        trialRows.push(row); if(s.save) await CogDB.insertTrial(row); resolve(row);
      }, trialEndMs);
    });
  }

  function buildSummary(){
    if(cfg.template!=='uznadze_fixed_set') return {validity_status:'valid',calibration_px_per_mm:pxPerMm};
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

  boot().catch(e=>{ console.error(e); show(`<h2>Error</h2><p>${esc(e.message)}</p>`); });
})();
