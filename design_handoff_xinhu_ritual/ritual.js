/* ══════════════════════════════════════════════════════════
   心湖 · 会话仪式  (self-mounting interactive ritual)
   入静 settle → 倾诉 speak → 聆听 listen → 洞察 insight
   单一光球贯穿全程；倾诉阶段由真实麦克风驱动环形声波。
   ══════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  const api = window.XinhuRitualApi || null;
  // Prepared for the next integration step: call api.createInsight during listen.
  void api;

  /* ── injected styles ── */
  const css = `
  #ritual{position:fixed;inset:0;z-index:300;display:none;background-color:#FAF8F4;
    background-image:radial-gradient(ellipse 90% 70% at 50% 30%,#FFFFFF 0%,rgba(250,248,244,0) 55%,#F2EEE7 100%);
    flex-direction:column;align-items:center;justify-content:center;
    overflow:hidden;font-family:var(--font-body);}
  #ritual.open{display:flex;}
  .rt-stage{animation:rt-rise .9s cubic-bezier(.22,1,.36,1) both;}
  @keyframes rt-rise{from{transform:translateY(20px)}to{transform:none}}

  /* ambient lake ripples at base */
  .rt-ambient{position:absolute;bottom:-40px;left:50%;transform:translateX(-50%);width:1100px;height:380px;pointer-events:none;overflow:hidden;opacity:.6;}
  .rt-amb-ring{position:absolute;bottom:-80px;left:50%;transform:translateX(-50%);border-radius:50%;border:1px solid rgba(138,158,140,.18);animation:rt-amb 9s ease-out infinite;}
  .rt-amb-ring:nth-child(1){width:300px;height:140px;animation-delay:0s}
  .rt-amb-ring:nth-child(2){width:560px;height:230px;animation-delay:2.2s}
  .rt-amb-ring:nth-child(3){width:820px;height:320px;animation-delay:4.4s}
  .rt-amb-ring:nth-child(4){width:1080px;height:400px;animation-delay:6.6s}
  @keyframes rt-amb{0%{opacity:.5;transform:translateX(-50%) scale(.98)}100%{opacity:0;transform:translateX(-50%) scale(1.04)}}

  /* top bar */
  .rt-top{position:absolute;top:0;left:0;right:0;z-index:6;display:flex;align-items:center;justify-content:space-between;padding:1.5rem 2.2rem;}
  .rt-brand{font-family:var(--font-serif);font-size:1rem;color:var(--ink-soft);letter-spacing:.04em;display:flex;align-items:center;gap:9px;opacity:.8;}
  .rt-brand .d{width:7px;height:7px;border-radius:50%;background:var(--sage);animation:breathe 4s ease-in-out infinite;}
  .rt-dots{display:flex;gap:8px;align-items:center;}
  .rt-dot{width:6px;height:6px;border-radius:50%;background:var(--sage-light);transition:all .5s cubic-bezier(.22,1,.36,1);}
  .rt-dot.on{background:var(--sage);width:22px;border-radius:3px;}
  .rt-dot.done{background:var(--sage);}
  .rt-close{width:38px;height:38px;border-radius:50%;border:0.5px solid rgba(138,158,140,.3);background:rgba(255,255,255,.5);color:var(--ink-soft);font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .3s;}
  .rt-close:hover{background:var(--sage);color:#fff;border-color:var(--sage);transform:rotate(90deg);}

  /* center stage */
  .rt-stage{position:relative;z-index:5;display:flex;flex-direction:column;align-items:center;text-align:center;padding:2rem;width:100%;max-width:620px;}
  .rt-eyebrow{font-size:.72rem;letter-spacing:.22em;text-transform:uppercase;color:var(--sage);margin-bottom:1.1rem;transition:all .7s ease;}
  .rt-prompt{font-family:var(--font-serif);font-size:clamp(1.5rem,3.4vw,2.1rem);font-weight:400;color:var(--ink);line-height:1.5;min-height:1.5em;margin-bottom:.6rem;transition:opacity .5s ease;}
  .rt-sub{font-size:.92rem;color:var(--ink-soft);line-height:1.85;max-width:380px;margin:0 auto;transition:opacity .5s ease;}

  /* orb centerpiece */
  .rt-center{position:relative;width:300px;height:300px;margin:2.4rem 0;display:flex;align-items:center;justify-content:center;}
  .rt-ringsvg{position:absolute;inset:0;transform:rotate(-90deg);}
  .rt-ringsvg circle{fill:none;stroke-linecap:round;}
  .rt-ring-track{stroke:rgba(138,158,140,.16);}
  .rt-ring-prog{stroke:var(--sage);transition:stroke-dashoffset .25s linear;opacity:0;}
  #ritual[data-stage="speak"] .rt-ring-prog{opacity:1;}
  .rt-bars{position:absolute;inset:0;opacity:0;transition:opacity .6s ease;}
  #ritual[data-stage="speak"] .rt-bars{opacity:1;}
  .rt-bar{position:absolute;left:50%;top:50%;width:3px;height:6px;border-radius:2px;background:var(--sage);transform-origin:center bottom;will-change:height,transform;}
  .rt-orb{position:relative;width:150px;height:150px;border-radius:50%;z-index:2;
    background:radial-gradient(circle at 38% 34%,#FBFDFB 0%,#DCE7DB 42%,#9DB29E 100%);
    box-shadow:0 20px 60px rgba(138,158,140,.4),inset 0 -8px 22px rgba(110,130,112,.35),inset 0 6px 16px rgba(255,255,255,.8);
    display:flex;align-items:center;justify-content:center;
    transition:transform .35s cubic-bezier(.22,1,.36,1),box-shadow .5s;will-change:transform;}
  .rt-orb-label{font-family:var(--font-serif);font-size:.95rem;color:rgba(44,44,42,.55);letter-spacing:.16em;transition:opacity .5s;}
  .rt-halo{position:absolute;width:150px;height:150px;border-radius:50%;border:1px solid rgba(138,158,140,.3);pointer-events:none;}
  .rt-halo.h2{opacity:.5;}
  #ritual[data-stage="listen"] .rt-orb{box-shadow:0 16px 50px rgba(138,158,140,.5),inset 0 -8px 22px rgba(110,130,112,.4),inset 0 6px 16px rgba(255,255,255,.8);}

  .rt-timer{font-family:var(--font-serif);font-size:1.05rem;color:var(--mist);letter-spacing:.1em;margin-bottom:1.6rem;min-height:1.2em;opacity:0;transition:opacity .5s;}
  #ritual[data-stage="speak"] .rt-timer{opacity:1;}

  /* controls */
  .rt-actions{display:flex;gap:1rem;align-items:center;justify-content:center;flex-wrap:wrap;min-height:52px;}
  .rt-btn{background:var(--ink);color:var(--cream);padding:.95rem 2.4rem;border-radius:100px;font-size:.95rem;font-weight:400;cursor:pointer;border:none;letter-spacing:.04em;font-family:var(--font-body);transition:all .4s cubic-bezier(.22,1,.36,1);display:inline-flex;align-items:center;gap:9px;}
  .rt-btn .bd{width:7px;height:7px;border-radius:50%;background:var(--sage-light);transition:all .4s;}
  .rt-btn:hover{background:var(--sage);transform:translateY(-2px);box-shadow:0 14px 40px rgba(138,158,140,.4);}
  .rt-btn:hover .bd{background:#fff;}
  .rt-btn.ghost{background:transparent;color:var(--ink-soft);border:0.5px solid rgba(138,158,140,.35);}
  .rt-btn.ghost:hover{background:var(--sage-pale);color:var(--ink);box-shadow:none;transform:none;border-color:var(--sage);}
  .rt-btn.stop{background:#fff;color:var(--ink);border:0.5px solid var(--sage);box-shadow:0 6px 24px rgba(138,158,140,.18);}
  .rt-btn.stop:hover{background:var(--sage);color:#fff;}
  .rt-mic-note{font-size:.78rem;color:var(--mist);letter-spacing:.04em;margin-top:1.1rem;opacity:.8;display:flex;align-items:center;gap:7px;justify-content:center;}
  .rt-mic-note .ld{width:6px;height:6px;border-radius:50%;background:var(--warm);animation:breathe 1.6s ease-in-out infinite;}

  /* insight cards */
  .rt-insights{display:flex;flex-direction:column;gap:14px;width:100%;max-width:480px;margin:1.6rem auto 2rem;}
  .rt-card{background:rgba(255,255,255,.7);backdrop-filter:blur(6px);border:0.5px solid rgba(138,158,140,.25);border-radius:1.3rem;padding:1.4rem 1.6rem;text-align:left;
    transform:translateY(26px) scale(.985);transition:transform .85s cubic-bezier(.22,1,.36,1);}
  .rt-card.in{transform:none;}
  .rt-card .ct{font-size:.7rem;letter-spacing:.16em;text-transform:uppercase;color:var(--sage);margin-bottom:.6rem;display:flex;align-items:center;gap:8px;}
  .rt-card .ct .cn{width:18px;height:18px;border-radius:50%;border:0.5px solid var(--sage-light);display:flex;align-items:center;justify-content:center;font-family:var(--font-serif);font-size:.62rem;color:var(--sage);}
  .rt-card .cx{font-family:var(--font-serif);font-size:1.05rem;color:var(--ink);line-height:1.7;}
  .rt-card.q{background:linear-gradient(135deg,var(--sage-pale),#F5F0EC);border-color:var(--sage-light);}
  .rt-card.q .cx{font-style:italic;}
  .rt-saved{font-size:.82rem;color:var(--mist);letter-spacing:.04em;margin-bottom:1.2rem;display:flex;align-items:center;gap:8px;justify-content:center;transform:translateY(8px);transition:transform .6s;}
  .rt-saved.in{transform:none;}
  .rt-saved .sv{color:var(--sage);}

  @media(max-width:600px){
    .rt-center{width:260px;height:260px;margin:1.8rem 0;}
    .rt-orb,.rt-halo{width:130px;height:130px;}
  }
  `;
  const style=document.createElement('style');
  style.textContent=css; document.head.appendChild(style);

  /* ── markup ── */
  const root=document.getElementById('ritual');
  root.innerHTML = `
    <div class="rt-ambient"><div class="rt-amb-ring"></div><div class="rt-amb-ring"></div><div class="rt-amb-ring"></div><div class="rt-amb-ring"></div></div>
    <div class="rt-top">
      <div class="rt-brand"><span class="d"></span>心湖会话</div>
      <div class="rt-dots"><span class="rt-dot on" data-d="0"></span><span class="rt-dot" data-d="1"></span><span class="rt-dot" data-d="2"></span></div>
      <button class="rt-close" aria-label="关闭" id="rt-close">✕</button>
    </div>
    <div class="rt-stage">
      <div class="rt-eyebrow" id="rt-eyebrow">入静</div>
      <div class="rt-prompt" id="rt-prompt">先陪自己，深呼吸三次</div>
      <div class="rt-sub" id="rt-sub">跟随这颗光球，吸气时它会舒展，呼气时它会收拢。<br>当你觉得安定了，就开始说。</div>
      <div class="rt-center">
        <svg class="rt-ringsvg" viewBox="0 0 300 300">
          <circle class="rt-ring-track" cx="150" cy="150" r="138" stroke-width="2"></circle>
          <circle class="rt-ring-prog" id="rt-ring" cx="150" cy="150" r="138" stroke-width="3"></circle>
        </svg>
        <div class="rt-bars" id="rt-bars"></div>
        <div class="rt-halo" id="rt-halo1"></div>
        <div class="rt-halo h2" id="rt-halo2"></div>
        <div class="rt-orb" id="rt-orb"><span class="rt-orb-label" id="rt-orb-label">吸气</span></div>
      </div>
      <div class="rt-timer" id="rt-timer">0:00 / 1:00</div>
      <div class="rt-actions" id="rt-actions"></div>
      <div id="rt-extra"></div>
    </div>
  `;

  /* ── refs ── */
  const $=(id)=>document.getElementById(id);
  const elEyebrow=$('rt-eyebrow'), elPrompt=$('rt-prompt'), elSub=$('rt-sub'),
        elOrb=$('rt-orb'), elOrbLabel=$('rt-orb-label'), elTimer=$('rt-timer'),
        elActions=$('rt-actions'), elExtra=$('rt-extra'), elBars=$('rt-bars'),
        elRing=$('rt-ring'), elHalo1=$('rt-halo1'), elHalo2=$('rt-halo2'),
        dots=[...document.querySelectorAll('.rt-dot')];

  /* ── build circular bars ── */
  const BAR_N=60, BASE_R=92;
  const bars=[];
  for(let i=0;i<BAR_N;i++){
    const b=document.createElement('div'); b.className='rt-bar';
    const ang=(i/BAR_N)*360;
    b.dataset.ang=ang;
    b.style.transform=`rotate(${ang}deg) translateY(-${BASE_R}px)`;
    b.style.opacity=0.35+0.65*Math.abs(Math.sin(i/BAR_N*Math.PI));
    elBars.appendChild(b); bars.push(b);
  }
  const RING_R=138, RING_C=2*Math.PI*RING_R;
  elRing.style.strokeDasharray=RING_C;
  elRing.style.strokeDashoffset=RING_C;

  /* ── ring stage dots ── */
  function setDot(stageGroup){ // 0 settle,1 speak/listen,2 insight
    dots.forEach((d,i)=>{ d.classList.toggle('on',i===stageGroup); d.classList.toggle('done',i<stageGroup); });
  }

  /* ── insight content sets ── */
  const SETS=[
    {s:'你说的是时间不够，但你真正在意的，也许是怕辜负了对自己的期待。',
     p:'描述压力时，你很少提到自己想要什么——多是别人需要什么。',
     q:'如果这件事没有任何人会评价你，你还会用同样的方式去做吗？'},
    {s:'表面上你在烦那件小事，底下藏着的，是"我是不是不够好"的怀疑。',
     p:'你习惯先照顾好别人的情绪，把自己的放到最后。',
     q:'今天，有没有一件小事，是可以只为你自己做的？'},
    {s:'你不是累于事情本身，而是累于"必须一个人撑住"的那种感觉。',
     p:'你很擅长分析，却很少允许自己只是单纯地难过。',
     q:'如果此刻可以向一个人求助，你最想说的第一句话是什么？'},
    {s:'你反复提到"应该"，却很少提到"想要"。',
     p:'你对别人格外宽容，对自己却异常严厉。',
     q:'你愿意像对待最好的朋友那样，对自己说一句话吗？'}
  ];

  /* ── state ── */
  let stage='settle';
  let raf=null, breathT0=0;
  let audioCtx=null, analyser=null, micStream=null, freqData=null;
  let speakStart=0, speakDur=60, speakTimer=null, simPhase=0;
  let usingMic=false;
  let backendInsightResult=null;
  let backendInsightError=null;
  let lastTranscript='';
  let speechRecognition=null;
  let speechSupported=false;
  let recognizedTranscript='';
  let interimTranscript='';
  let latestSpeechTranscript='';
  let recognitionStarted=false;

  const easeInOut=(x)=> x<0.5 ? 2*x*x : 1-Math.pow(-2*x+2,2)/2;
  const isBackendEnabled=()=> window.XINHU_USE_BACKEND===true && api && typeof api.createInsight==='function';
  const isSpeechDebug=()=> window.XINHU_DEBUG_SPEECH===true;
  function resetBackendState(){
    backendInsightResult=null;
    backendInsightError=null;
    lastTranscript='';
  }
  function initSpeechRecognition(){
    const SpeechRecognition=window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SpeechRecognition){ console.warn('[Xinhu] SpeechRecognition is not supported in this browser.'); return; }
    speechSupported=true;
    if(isSpeechDebug()) console.log('[Xinhu speech] SpeechRecognition supported.');
    speechRecognition=new SpeechRecognition();
    speechRecognition.lang='zh-CN';
    speechRecognition.continuous=true;
    speechRecognition.interimResults=true;
    speechRecognition.onstart=()=>{ if(isSpeechDebug()) console.log('[Xinhu speech] recognition.onstart'); };
    speechRecognition.onresult=(event)=>{
      let finalText='';
      let currentInterim='';
      for(let i=event.resultIndex;i<event.results.length;i++){
        const result=event.results[i];
        if(result.isFinal && result[0] && result[0].transcript){
          finalText+=result[0].transcript;
        }else if(!result.isFinal && result[0] && result[0].transcript){
          currentInterim+=result[0].transcript;
        }
      }
      if(finalText) recognizedTranscript+=(recognizedTranscript ? ' ' : '')+finalText.trim();
      interimTranscript=currentInterim.trim();
      latestSpeechTranscript=(recognizedTranscript+' '+interimTranscript).trim();
      if(isSpeechDebug()) console.log('[Xinhu speech] recognition.onresult', {finalText:finalText.trim(),interimTranscript,latestSpeechTranscript});
    };
    speechRecognition.onerror=(event)=>{
      console.warn('[Xinhu] SpeechRecognition error.', event.error || event);
      if(isSpeechDebug()) console.log('[Xinhu speech] recognition.onerror', event.error || event);
    };
    speechRecognition.onend=()=>{ recognitionStarted=false; if(isSpeechDebug()) console.log('[Xinhu speech] recognition.onend'); };
  }
  initSpeechRecognition();
  function startSpeechRecognition(){
    recognizedTranscript='';
    interimTranscript='';
    latestSpeechTranscript='';
    if(!speechSupported || !speechRecognition)return;
    try{
      speechRecognition.start();
      recognitionStarted=true;
    }catch(error){ console.warn('[Xinhu] SpeechRecognition start failed.', error); }
  }
  function stopSpeechRecognition(){
    if(!recognitionStarted || !speechRecognition)return;
    try{ speechRecognition.stop(); }
    catch(error){ console.warn('[Xinhu] SpeechRecognition stop failed.', error); }
    recognitionStarted=false;
  }
  function getTranscriptForBackend(){
    if(typeof window.XINHU_DEV_TRANSCRIPT==='string' && window.XINHU_DEV_TRANSCRIPT.trim()){
      lastTranscript=window.XINHU_DEV_TRANSCRIPT.trim();
      return lastTranscript;
    }
    const speechText=(recognizedTranscript || latestSpeechTranscript || interimTranscript || '').trim();
    lastTranscript=speechText;
    return lastTranscript;
  }
  function requestBackendInsight(){
    if(!isBackendEnabled())return;
    const transcript=lastTranscript || getTranscriptForBackend();
    if(!transcript){
      backendInsightError=new Error('TRANSCRIPT_EMPTY_LOCAL');
      console.warn('[Xinhu] No transcript recognized; fallback to local SETS.');
      return;
    }
    const durationSeconds=speakStart ? Math.min(speakDur, Math.max(0, Math.round((performance.now()-speakStart)/1000))) : 0;
    const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
    // Dev only:
    // window.XINHU_USE_BACKEND = true
    // window.XINHU_DEV_TRANSCRIPT = '我最近真的很累，感觉一直被压力推着走'
    api.createInsight({transcript,durationSeconds,timezone})
      .then((result)=>{ backendInsightResult=result; })
      .catch((error)=>{ backendInsightError=error; });
  }
  function chooseInsightSet(){
    const fallback=SETS[Math.floor(Math.random()*SETS.length)];
    if(!window.XINHU_USE_BACKEND)return fallback;
    if(backendInsightError){ console.warn('Xinhu backend insight failed; using local SETS fallback.', backendInsightError); return fallback; }
    const insight=backendInsightResult && backendInsightResult.ok===true && backendInsightResult.data && backendInsightResult.data.insight;
    if(!insight){
      if(backendInsightResult && backendInsightResult.data && backendInsightResult.data.meta && backendInsightResult.data.meta.riskLevel==='crisis'){
        console.warn('Xinhu backend returned crisis response; using local SETS fallback.');
      }
      return fallback;
    }
    return {s:insight.struggle,p:insight.pattern,q:insight.question};
  }

  /* ════ STAGE: SETTLE (breathing) ════ */
  function startSettle(){
    resetBackendState();
    stage='settle'; root.dataset.stage='settle'; setDot(0);
    elEyebrow.textContent='入静'; elEyebrow.classList.add('in');
    elPrompt.textContent='先陪自己，深呼吸三次';
    elSub.innerHTML='跟随这颗光球，吸气时它舒展，呼气时它收拢。<br>当你觉得安定了，就开始说。';
    elSub.style.opacity='1'; elTimer.style.opacity='0';
    elOrbLabel.style.opacity='1';
    elActions.innerHTML=`<button class="rt-btn" id="rt-go"><span class="bd"></span>我准备好了，开始说</button>`;
    elExtra.innerHTML='';
    $('rt-go').onclick=startSpeak;
    breathT0=performance.now();
    cancelAnimationFrame(raf);
    loopBreath();
  }
  function loopBreath(){
    const t=(performance.now()-breathT0)/1000;
    const P=8; // 4s in, 4s out
    const ph=(t%P)/P;
    let scale,label;
    if(ph<0.5){ const p=easeInOut(ph/0.5); scale=0.82+0.30*p; label='吸气'; }
    else{ const p=easeInOut((ph-0.5)/0.5); scale=1.12-0.30*p; label='呼气'; }
    elOrb.style.transform=`scale(${scale})`;
    elHalo1.style.transform=`scale(${scale*1.12})`; elHalo1.style.opacity=String(0.5*scale-0.1);
    elHalo2.style.transform=`scale(${scale*1.30})`; elHalo2.style.opacity=String(0.32*scale-0.1);
    if(elOrbLabel.textContent!==label) elOrbLabel.textContent=label;
    raf=requestAnimationFrame(loopBreath);
  }

  /* ════ STAGE: SPEAK (mic waveform + countdown) ════ */
  async function startSpeak(){
    stage='speak'; root.dataset.stage='speak'; setDot(1);
    cancelAnimationFrame(raf);
    recognizedTranscript='';
    interimTranscript='';
    latestSpeechTranscript='';
    lastTranscript='';
    backendInsightResult=null;
    backendInsightError=null;
    startSpeechRecognition();
    elEyebrow.textContent='倾诉';
    elSub.style.opacity='0';
    elOrbLabel.style.opacity='0';
    elHalo1.style.opacity='0'; elHalo2.style.opacity='0';
    elPrompt.style.opacity='0';
    setTimeout(()=>{ elPrompt.textContent='今天，什么在你心里？'; elPrompt.style.opacity='1'; },300);
    elActions.innerHTML=`<button class="rt-btn stop" id="rt-stop"><span class="bd" style="background:var(--sage)"></span>说完了</button>`;
    $('rt-stop').onclick=()=>endSpeak();
    elExtra.innerHTML='';

    // try mic
    usingMic=false;
    try{
      micStream=await navigator.mediaDevices.getUserMedia({audio:true});
      audioCtx=new (window.AudioContext||window.webkitAudioContext)();
      const src=audioCtx.createMediaStreamSource(micStream);
      analyser=audioCtx.createAnalyser(); analyser.fftSize=128; analyser.smoothingTimeConstant=0.78;
      src.connect(analyser);
      freqData=new Uint8Array(analyser.frequencyBinCount);
      usingMic=true;
    }catch(e){ usingMic=false; }

    elExtra.innerHTML = usingMic
      ? `<div class="rt-mic-note"><span class="ld"></span>正在聆听你的声音 · 设备本地处理，不上传</div>`
      : `<div class="rt-mic-note"><span class="ld"></span>未开启麦克风也没关系 · 你可以静静地说，或随时结束</div>`;

    speakStart=performance.now();
    elPrompt.dataset.t=0;
    loopSpeak();
    // rotate gentle prompts
    speakTimer=setTimeout(()=>{ swapPrompt('不用组织语言，想到什么就说什么'); 
      speakTimer=setTimeout(()=>{ swapPrompt('就让它自然地流出来…'); },14000);
    },9000);
  }
  function swapPrompt(txt){
    if(stage!=='speak')return;
    elPrompt.style.opacity='0';
    setTimeout(()=>{ elPrompt.textContent=txt; elPrompt.style.opacity='1'; },450);
  }
  function loopSpeak(){
    const elapsed=(performance.now()-speakStart)/1000;
    const remain=Math.max(0,speakDur-elapsed);
    // timer
    const m=Math.floor(elapsed/60), s=Math.floor(elapsed%60);
    elTimer.textContent=`${m}:${String(s).padStart(2,'0')} / 1:00`;
    // ring
    elRing.style.strokeDashoffset=String(RING_C*(1-elapsed/speakDur));
    // amplitude
    let amp=0;
    if(usingMic && analyser){
      analyser.getByteFrequencyData(freqData);
      // map: use first half of bins, mirror across the circle
      const half=Math.floor(BAR_N/2);
      let sum=0;
      for(let i=0;i<BAR_N;i++){
        const bin= i<half ? i : (BAR_N-1-i);
        const idx=Math.min(freqData.length-1, 2+bin);
        const v=freqData[idx]/255;
        sum+=v;
        const h=6+v*46;
        const b=bars[i];
        b.style.height=h+'px';
        b.style.background = v>0.55 ? 'var(--sage)' : 'var(--sage-light)';
      }
      amp=sum/BAR_N;
    } else {
      // simulated soft waveform
      simPhase+=0.06;
      let sum=0;
      for(let i=0;i<BAR_N;i++){
        const v=0.18+0.5*Math.abs(Math.sin(simPhase+i*0.4))*(0.5+0.5*Math.sin(simPhase*0.7));
        sum+=v;
        bars[i].style.height=(6+v*40)+'px';
      }
      amp=sum/BAR_N;
    }
    // orb pulse from amplitude
    const sc=1+Math.min(0.16,amp*0.3);
    elOrb.style.transform=`scale(${sc})`;
    if(remain<=0){ endSpeak(); return; }
    raf=requestAnimationFrame(loopSpeak);
  }
  function endSpeak(){
    if(stage!=='speak')return;
    clearTimeout(speakTimer);
    cancelAnimationFrame(raf);
    stopSpeechRecognition();
    stopMic();
    startListen();
  }
  function stopMic(){
    try{ if(micStream){ micStream.getTracks().forEach(t=>t.stop()); micStream=null; } }catch(e){}
    try{ if(audioCtx){ audioCtx.close(); audioCtx=null; } }catch(e){}
    analyser=null;
  }

  /* ════ STAGE: LISTEN (processing) ════ */
  function startListen(){
    stage='listen'; root.dataset.stage='listen'; setDot(1);
    lastTranscript=getTranscriptForBackend();
    if(isSpeechDebug()) console.log('[Xinhu speech] transcript for backend:', lastTranscript);
    requestBackendInsight();
    elEyebrow.textContent='聆听';
    elTimer.style.opacity='0';
    elRing.style.strokeDashoffset=String(RING_C);
    // collapse bars softly
    bars.forEach(b=>{ b.style.height='4px'; });
    elOrb.style.transform='scale(1)';
    elPrompt.style.opacity='0';
    const lines=['正在听见你…','理解你说出的话','寻找话语之下的东西','准备三面小小的镜子'];
    let li=0;
    setTimeout(()=>{ elPrompt.textContent=lines[0]; elPrompt.style.opacity='1'; },350);
    elSub.style.opacity='0';
    elActions.innerHTML=''; elExtra.innerHTML='';
    const cyc=setInterval(()=>{
      li++; if(li>=lines.length){ clearInterval(cyc); return; }
      elPrompt.style.opacity='0';
      setTimeout(()=>{ elPrompt.textContent=lines[li]; elPrompt.style.opacity='1'; },400);
    },1100);
    // gentle orb breathing during listen
    let lt0=performance.now();
    cancelAnimationFrame(raf);
    (function pulse(){
      const t=(performance.now()-lt0)/1000;
      const sc=1+0.06*Math.sin(t*1.6);
      elOrb.style.transform=`scale(${sc})`;
      if(stage==='listen') raf=requestAnimationFrame(pulse);
    })();
    setTimeout(()=>{ clearInterval(cyc); startInsight(); }, 4600);
  }

  /* ════ STAGE: INSIGHT (3 cards) ════ */
  function startInsight(){
    stage='insight'; root.dataset.stage='insight'; setDot(2);
    cancelAnimationFrame(raf);
    elEyebrow.textContent='三份洞察';
    elPrompt.style.opacity='0';
    setTimeout(()=>{ elPrompt.textContent='这是此刻的你，在湖面上的倒影'; elPrompt.style.opacity='1'; },350);
    elSub.style.opacity='0';
    elTimer.style.opacity='0';
    elOrb.style.transform='scale(.62)';
    elHalo1.style.opacity='0'; elHalo2.style.opacity='0';

    const set=chooseInsightSet();
    elActions.innerHTML='';
    elExtra.innerHTML=`
      <div class="rt-insights">
        <div class="rt-card" data-i="0"><div class="ct"><span class="cn">一</span>你真正在纠结的</div><div class="cx">${set.s}</div></div>
        <div class="rt-card" data-i="1"><div class="ct"><span class="cn">二</span>我注意到的模式</div><div class="cx">${set.p}</div></div>
        <div class="rt-card q" data-i="2"><div class="ct"><span class="cn">三</span>带走的问题</div><div class="cx">${set.q}</div></div>
      </div>
      <div class="rt-saved" id="rt-saved"><span class="sv">✓</span>本次会话已存入你的心湖 · 仅你可见</div>
      <div class="rt-actions">
        <button class="rt-btn" id="rt-again"><span class="bd"></span>再说一次</button>
        <button class="rt-btn ghost" id="rt-done">把问题带走，完成</button>
      </div>`;
    const cards=[...elExtra.querySelectorAll('.rt-card')];
    cards.forEach((c,i)=> setTimeout(()=>c.classList.add('in'), 500+i*900));
    setTimeout(()=>{ const sv=$('rt-saved'); if(sv) sv.classList.add('in'); }, 500+cards.length*900+200);
    $('rt-again').onclick=()=>{ resetVisual(); startSettle(); };
    $('rt-done').onclick=close;
  }

  function resetVisual(){
    elPrompt.style.opacity='1'; elSub.style.opacity='1';
    elOrb.style.transform='scale(1)';
    bars.forEach(b=>b.style.height='6px');
    elRing.style.strokeDashoffset=String(RING_C);
  }

  /* ════ OPEN / CLOSE ════ */
  function open(){
    root.classList.add('open');
    document.body.style.overflow='hidden';
    resetBackendState();
    resetVisual();
    startSettle();
  }
  function close(){
    cancelAnimationFrame(raf);
    clearTimeout(speakTimer);
    stopSpeechRecognition();
    stopMic();
    stage='closed';
    document.body.style.overflow='';
    root.classList.remove('open');
  }
  $('rt-close').onclick=close;
  document.addEventListener('keydown',(e)=>{ if(e.key==='Escape' && root.classList.contains('open')) close(); });

  window.Ritual={open,close};
})();
