(function () {
  'use strict';
  const NS = (window.QuickComments = window.QuickComments || {});

  NS.renderBar = function renderQuickCommentBar(show) {
    const quickBarDiv = document.getElementById('quick-comment-bar-container');
    if (!quickBarDiv) return;
    if (!show) { quickBarDiv.innerHTML = ''; return; }

    if (!document.getElementById('qc-style')) {
      const style = document.createElement('style');
      style.id = 'qc-style';
      style.textContent = `
.quickbar{display:grid;grid-template-columns:1fr;gap:10px;padding:12px;background:rgba(0,0,0,.08);border-radius:12px;margin:8px 0;}
@media (min-width:640px){.quickbar{grid-template-columns:auto 1fr auto;align-items:center;gap:12px;}}
.qc-row{display:flex;align-items:center;gap:8px;min-width:0;}
.qc-label{display:none;} /* הוסר תווית מספר כתף */
.qc-input-row{display:flex;align-items:center;gap:6px;flex:1;min-width:0;}
/* NEW runner select */
.qc-runner-select{
  width:64px;min-width:54px;max-width:72px;height:34px;
  font-size:13px;font-weight:600;
  border:1px solid rgba(0,0,0,.15);border-radius:8px;
  background:#fff;color:#111827;box-sizing:border-box;
  text-align:center;text-align-last:center;direction:rtl;flex:0 0 auto;
}
.dark .qc-runner-select{background:#374151;color:#f9fafb;border-color:rgba(255,255,255,.2);}
.qc-runner-select option{background:#fff;color:#111827;}
.dark .qc-runner-select option{background:#374151;color:#f9fafb;}
.qc-input{flex:1;height:40px;
  padding:8px 4px 8px 12px; /* יישור הדוק לימין: צמצום padding-right מ-12px ל-4px */
  border-radius:8px;border:1px solid rgba(0,0,0,.15);
  background:rgba(255,255,255,.9);color:#111827;font-size:16px;
  text-align:right;min-width:0;}
.dark .qc-input{background:rgba(255,255,255,.06);color:inherit;border-color:rgba(255,255,255,.14);}
/* יישור placeholder לימין */
.qc-input::placeholder,
.qc-input::-webkit-input-placeholder,
.qc-input::-moz-placeholder,
.qc-input:-ms-input-placeholder,
.qc-input::-ms-input-placeholder{ text-align:left; direction:rtl; }
.qc-micBtn{width:40px;height:40px;border-radius:8px;border:1px solid rgba(0,0,0,.15);background:#374151;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;}
.qc-micBtn:hover{background:#4b5563;}
.qc-micBtn.recording{background:#ef4444;border-color:#dc2626;}
.qc-sendBtn{
  height:32px;padding:0 12px;font-size:12px;line-height:1;
  display:inline-flex;align-items:center;justify-content:center;
  border-radius:8px;
}
.qc-sendBtn:disabled{opacity:.5;cursor:not-allowed;}
.qc-sendBtn:not(:disabled):hover{background:#059669;}
.qc-group-select{flex:1 1 auto;min-width:120px;max-width:220px;height:34px;font-size:13px;padding:0 6px;border:1px solid rgba(0,0,0,.15);border-radius:8px;background:#fff;color:#111827;box-sizing:border-box;direction:rtl;text-align:center;text-align-last:center;}
.dark .qc-group-select{background:#374151;color:#f9fafb;border-color:rgba(255,255,255,.2);}
/* כפתור פתיחת חלון ההערות */
.qc-group-trigger{
  flex:0 0 auto;min-width:auto;max-width:200px;
  height:30px;padding:0 10px;
  border:1px solid rgba(0,0,0,.25);border-radius:8px;
  background:#ffffff;font-size:12px;font-weight:600;cursor:pointer;
  direction:rtl;text-align:right;display:inline-flex;align-items:center;
  gap:6px;line-height:1;white-space:nowrap;
}
.qc-group-trigger span[style]{font-size:9px!important;}
.dark .qc-group-trigger{background:#374151;color:#f9fafb;border-color:rgba(255,255,255,.25);}
.qc-group-trigger:hover{background:#f3f4f6;}
.dark .qc-group-trigger:hover{background:#4b5563;}
/* חלון קבוצות */
.qc-group-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.38);z-index:9998;display:none;}
/* UPDATED: ממורכז למעלה */
.qc-group-modal{
  position:fixed;
  top:16px;
  left:50%;
  transform:translateX(-50%);
  background:#ffffff;
  border-radius:18px;
  padding:16px 18px;
  width:min(520px,92%);
  max-height:78vh;
  overflow-y:auto;
  direction:rtl;
  text-align:right;
  z-index:9999;
  box-shadow:0 10px 30px -6px rgba(0,0,0,.32);
  font-size:13px;
  line-height:1.35;
}
.dark .qc-group-modal{background:#1f2937;color:#f9fafb;}
.qc-group-modal h2{margin:0 0 10px;font-size:15px;font-weight:800;letter-spacing:.3px;}
.qc-group-box{
  border:2px solid;border-radius:14px;padding:10px 12px;margin:0 0 10px;
  background:#f9fafb;
}
.dark .qc-group-box{background:#374151;}
.qc-group-box.good{border-color:#10b981;background:#ecfdf5;}
.dark .qc-group-box.good{background:#065f46;}
.qc-group-box.neutral{border-color:#6b7280;background:#f3f4f6;}
.dark .qc-group-box.neutral{background:#4b5563;}
.qc-group-box.bad{border-color:#dc2626;background:#fef2f2;}
.dark .qc-group-box.bad{background:#7f1d1d;}
.qc-group-title{
  display:block;font-size:13px;font-weight:800;margin:0 0 6px;
  padding:2px 10px;border-radius:999px;letter-spacing:.25px;
  background:rgba(0,0,0,.06);
}
.dark .qc-group-title{background:rgba(255,255,255,.12);}
/* רשימת פריטים אנכית */
.qc-group-items{
  display:flex;flex-direction:column;gap:4px;
}
.qc-group-item{
  position:relative;display:block;width:100%;
  cursor:pointer;padding:4px 34px 4px 10px;
  border-radius:8px;font-size:12px;font-weight:500;
  background:#ffffff;border:1px solid rgba(0,0,0,.10);
  line-height:1.25;transition:background .15s,border-color .15s;
  text-align:right;
}
.qc-group-item::before{
  content:'•';position:absolute;right:12px;top:50%;transform:translateY(-50%);
  font-size:14px;color:#6b7280;line-height:1;
}
.qc-group-item:hover{background:#eef2f7;border-color:rgba(0,0,0,.18);}
.dark .qc-group-item{
  background:#4b5563;border-color:rgba(255,255,255,.18);
}
.dark .qc-group-item:hover{
  background:#6b7280;border-color:rgba(255,255,255,.30);
}
.dark .qc-group-item::before{color:#d1d5db;}
.qc-group-close{
  position:static;
  top:auto;left:auto;
  margin:0 0 10px 0;
  background:#ef4444;color:#fff;border:none;font-weight:600;
  padding:5px 12px;border-radius:8px;cursor:pointer;font-size:12px;
}
.qc-group-close:hover{background:#dc2626;}
@media (max-width:430px){.quickbar{grid-template-columns:1fr!important;}}
@media (max-width:640px){
  .qc-row{flex-wrap:wrap;}
  .qc-group-trigger{flex:1;}
  .qc-runner-select{flex:0 0 auto;}
  .qc-input-row{flex:1 1 100%;}
}
.qc-row-input{justify-content:flex-end;} 
.qc-row-input .qc-input-row{flex:0 1 auto; width:100%; justify-content:flex-end;}
.qc-row-input .qc-input{width:100%; max-width:100%;} 
@media (max-width:640px){
  .qc-row-input .qc-input-row{width:100%;}
}`;
      document.head.appendChild(style);
    }

    const GROUP = (window.CONFIG && window.CONFIG.CRAWLING_GROUP_COMMON_COMMENTS) || {};
    const buildGroupOptions = () => {
      const mk = (label, arr) => Array.isArray(arr) && arr.length
        ? `<optgroup label="${label}">${arr.map(t => `<option value="${t}">${t}</option>`).join('')}</optgroup>` : '';
      return [
        '<option value="" disabled selected>הערה מהירה</option>',
        mk('חיובי', GROUP.good),
        mk('ניטרלי', GROUP.neutral),
        mk('טעון שיפור', GROUP.bad)
      ].join('');
    };

    function normalizeBool(v){
      if (typeof v === 'boolean') return v;
      if (v == null) return undefined;
      if (typeof v === 'number') return v !== 0;
      if (typeof v === 'string'){
        const s = v.trim().toLowerCase();
        if (['false','0','no','לא','inactive','inact','off','לא פעיל','לאפעיל'].includes(s)) return false;
        if (['true','1','yes','כן','active','on','פעיל'].includes(s)) return true;
      }
      return undefined;
    }

    const negativeRegex = /(retir|withdraw|withdrew|withdrawn|dropped|drop\s*out|quit|inactive|not.?active|non.?active|eliminat|eliminated|removed|disabled|hidden|injur|hurt|broken|פרש|פרישה|פרשה|נשר|נשרה|עזב|עזבה|עזיבה|הוסר|הוסרה|לא.?פעיל|פציעה|פצוע|הודח|הודחה|נפסל|נפסלה|לא\s*ממשיך|לא\s*משתתף)/i;

    const flagKeys = [
      'active','isActive','inactive','notActive','nonActive','retired','isRetired',
      'withdrawn','withdrew','dropped','droppedOut','quit','eliminated',
      'removed','isRemoved','disabled','hidden','blocked'
    ];

    const textKeys = [
      'status','state','phase','reason','note','notes','comment','comments',
      'description','label','tags','remarks'
    ];

    function isReallyActive(r){
      if(!r) return false;
      const sn = r.shoulderNumber;
      if (sn == null || sn === '') return false;

      // NEW: כיבוד מפה חיצונית של סטטוסי ריצה (מסומנים כלא פעילים)
      if (state?.crawlingDrills?.runnerStatuses && state.crawlingDrills.runnerStatuses[sn]) {
        return false;
      }

      const activeNorm = normalizeBool(r.active);
      if (activeNorm === false) return false;
      const isActiveNorm = normalizeBool(r.isActive);
      if (isActiveNorm === false) return false;

      for (const k of flagKeys){
        if (k in r){
          const v = r[k];
          if (k !== 'active' && k !== 'isActive'){
            const vb = normalizeBool(v);
            if (vb === true && ['inactive','notActive','nonActive','retired','isRetired',
              'withdrawn','withdrew','dropped','droppedOut','quit','eliminated',
              'removed','isRemoved','disabled','hidden','blocked']
              .includes(k)) return false;
          }
        }
      }

      const blob = textKeys
        .map(k => r[k])
        .filter(Boolean)
        .map(v => String(v))
        .join(' | ');

      if (blob && negativeRegex.test(blob)) return false;

      return true;
    }

    function buildActiveList(src){
      const seen = new Set();
      const list = [];
      for (const r of src){
        if (!isReallyActive(r)) continue;
        const key = String(r.shoulderNumber).trim();
        if (seen.has(key)) continue;
        seen.add(key);
        list.push(r);
      }
      return list;
    }

    const rawRunners = Array.isArray(state?.runners) ? state.runners : [];

    // תמיד בונה מחדש רשימת פעילים כדי לא "להיתקע" אחרי החזרה מפסילה/הסרה
    const active = buildActiveList(rawRunners);
    state.activeRunners = active;

    const selectable = active
      .map(r => ({ sn: String(r.shoulderNumber).trim(), r }))
      .filter((o,i,arr)=> arr.findIndex(x => x.sn === o.sn) === i)
      .sort((a,b)=> {
        const na = Number(a.sn), nb = Number(b.sn);
        if(!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.sn.localeCompare(b.sn,'he');
      })
      .map(o => o.r);

    const runnerOptions = selectable.length
      ? ['<option value="" disabled selected>מספר כתף</option>',
         ...selectable.map(r=>`<option value="${r.shoulderNumber}">${r.shoulderNumber}</option>`)].join('')
      : '<option value="" disabled selected>אין פעילים</option>';

    window.QuickComments.debugActiveRunners = function(){
      console.table(selectable.map(r => {
        return {
          shoulder: r.shoulderNumber,
          active: r.active,
          isActive: r.isActive,
          status: r.status || r.state || '',
          reason: r.reason || '',
          note: r.note || r.notes || '',
        };
      }));
      return selectable;
    };

    quickBarDiv.innerHTML = `
      <div class="quickbar" role="region" aria-label="הערה מהירה">
        <div class="qc-row">
          <select id="quick-runner-select" class="qc-runner-select" aria-label="מספר כתף">
            ${runnerOptions}
          </select>
          <button id="group-comments-trigger" type="button" class="qc-group-trigger" aria-haspopup="dialog" aria-expanded="false">
            <span>הערות מוכנות מראש</span><span style="font-size:15px;"></span>
          </button>
        </div>
        <div class="qc-row qc-row-input">
          <div class="qc-input-row">
            <input id="quick-comment-input" type="text" class="qc-input" placeholder="כתוב הערה...">
            <button id="quick-comment-mic" class="qc-micBtn" aria-label="הכתבה קולית" title="הכתבה קולית">🎤</button>
            <button id="quick-comment-send" class="qc-sendBtn" disabled>
              <span class="send-text">שלח</span>
            </button>
          </div>
        </div>
      </div>
      <div id="qc-group-backdrop" class="qc-group-modal-backdrop" aria-hidden="true"></div>
      <div id="qc-group-modal" class="qc-group-modal" role="dialog" aria-modal="true" aria-label="בחירת הערה מקוטלגת" style="display:none;"></div>`;

    const inputEl  = document.getElementById('quick-comment-input');
    const micBtn   = document.getElementById('quick-comment-mic');
    const sendBtn  = document.getElementById('quick-comment-send');
    const runnerSel= document.getElementById('quick-runner-select');
    const trigger  = document.getElementById('group-comments-trigger');
    const modal    = document.getElementById('qc-group-modal');
    const backdrop = document.getElementById('qc-group-backdrop');

    // UPDATED: ננעל עד שיש גם טקסט וגם מספר כתף נבחר
    const updateSendEnabled = () => {
      const hasText = inputEl.value.trim().length > 0;
      const hasRunner = runnerSel && runnerSel.value !== '';
      sendBtn.disabled = !(hasText && hasRunner);
    };
    inputEl.addEventListener('input', updateSendEnabled);
    runnerSel && runnerSel.addEventListener('change', updateSendEnabled);

    inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!sendBtn.disabled) send(); }
    });

    function buildGroupModalContent(){
      const mk = (cls,title,arr)=> (Array.isArray(arr)&&arr.length)?`
        <div class="qc-group-box ${cls}">
          <div class="qc-group-title">${title}</div>
          <div class="qc-group-items">
            ${arr.map(t=>`<span class="qc-group-item" data-value="${t}" role="button" tabindex="0">${t}</span>`).join('')}
          </div>
        </div>`:'';
      modal.innerHTML = `
        <button class="qc-group-close" type="button" id="qc-group-close">סגור ✕</button>
        <h2>בחרו הערה</h2>
        ${mk('good','חיובי',GROUP.good)}
        ${mk('neutral','ניטרלי',GROUP.neutral)}
        ${mk('bad','טעון שיפור',GROUP.bad)}`;
    }

    function openGroupModal(){
      buildGroupModalContent();
      backdrop.style.display='block';
      modal.style.display='block';
      trigger.setAttribute('aria-expanded','true');
      backdrop.setAttribute('aria-hidden','false');
      // SCROLL TO TOP כך שהמודאל יופיע מיד לנגד העיניים
      try { window.scrollTo({top:0,behavior:'smooth'}); } catch { window.scrollTo(0,0); }
      modal.querySelector('.qc-group-item')?.focus();
      document.addEventListener('keydown', escHandler);
    }

    function closeGroupModal(){
      modal.style.display='none';
      backdrop.style.display='none';
      trigger.setAttribute('aria-expanded','false');
      backdrop.setAttribute('aria-hidden','true');
      document.removeEventListener('keydown', escHandler);
      trigger.focus();
    }
    function escHandler(e){ if(e.key==='Escape') closeGroupModal(); }

    trigger.addEventListener('click', ()=>{
      if(modal.style.display==='block') closeGroupModal(); else openGroupModal();
    });
    backdrop.addEventListener('click', closeGroupModal);
    modal.addEventListener('click', e=>{
      if(e.target.id==='qc-group-close') closeGroupModal();
      const item = e.target.closest('.qc-group-item');
      if(item){
        const v = item.getAttribute('data-value');
        inputEl.value = (inputEl.value ? inputEl.value.trimEnd() + ' ' : '') + v;
        inputEl.dispatchEvent(new Event('input',{bubbles:true}));
        closeGroupModal();
        inputEl.focus();
      }
    });
    modal.addEventListener('keydown', e=>{
      if((e.key==='Enter'||e.key===' ') && e.target.classList.contains('qc-group-item')){
        e.preventDefault();
        e.target.click();
      }
    });

    function send(){
      const text = inputEl.value.trim();
      if(!text) return;
      if (!runnerSel || !runnerSel.value) return; // NEW: מחייב בחירת רץ
      const runnerKey = runnerSel.value;
      if(addCommentItem(runnerKey, text)){
        if (navigator.vibrate) navigator.vibrate(10);
        inputEl.value='';
        inputEl.placeholder='נשמר!';
        inputEl.dispatchEvent(new Event('input',{bubbles:true}));
        setTimeout(()=>{ inputEl.placeholder='הערה מהירה'; },900);
      }
    }
    sendBtn.addEventListener('click', send);

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null, isRecording = false;
    const isApple = /iP(hone|ad|od)|Mac/i.test(navigator.userAgent);
    if (isApple && micBtn) {
      micBtn.style.display = 'none';
    } else if (SR) {
      recognition = new SR();
      recognition.lang = 'he-IL';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript || '';
        inputEl.value = transcript;
        updateSendEnabled();
      };
      recognition.onerror = () => { isRecording = false; micBtn.classList.remove('recording'); micBtn.textContent = '🎤'; };
      recognition.onend = () => { isRecording = false; micBtn.classList.remove('recording'); micBtn.textContent = '🎤'; };
      const startRec = (e) => {
        e.preventDefault();
        if (!isRecording) {
          try { recognition.start(); isRecording = true; micBtn.classList.add('recording'); micBtn.textContent = '🛑'; } catch {}
        }
      };
      const stopRec = (e) => { e.preventDefault(); if (isRecording) recognition.stop(); };
      micBtn.addEventListener('mousedown', startRec);
      micBtn.addEventListener('mouseup', stopRec);
      micBtn.addEventListener('mouseleave', stopRec);
      micBtn.addEventListener('touchstart', startRec, { passive: false });
      micBtn.addEventListener('touchend', stopRec);
    } else if (micBtn) {
      micBtn.title = "הקלטה קולית דורשת דפדפן תומך ו-HTTPS.";
    }
  };

  NS.renderFAB = function renderQuickCommentFAB(show){
    if (!show) {
      document.getElementById('qc-fab')?.remove();
      document.getElementById('qc-sheet')?.remove();
      document.getElementById('qc-sheet-backdrop')?.remove();
      return;
    }

    if (!document.getElementById('qc-fab')) {
      const fab = document.createElement('button');
      fab.id = 'qc-fab';
      fab.className = 'qc-fab';
      fab.title = 'הוסף תגובה מהירה';
      fab.setAttribute('aria-label', 'הוסף תגובה מהירה');
      fab.textContent = '💬';
      document.body.appendChild(fab);

      const backdrop = document.createElement('div');
      backdrop.id = 'qc-sheet-backdrop';
      backdrop.className = 'qc-sheet-backdrop';
      document.body.appendChild(backdrop);

      const sheet = document.createElement('div');
      sheet.id = 'qc-sheet';
      sheet.className = 'qc-sheet';
      document.body.appendChild(sheet);

      const open = () => {
        backdrop.style.display = 'block';
        sheet.style.display = 'block';
        setTimeout(() => document.getElementById('fab-input')?.focus(), 0);
      };
      const close = () => {
        sheet.style.display = 'none';
        backdrop.style.display = 'none';
      };

      fab.addEventListener('click', open);
      backdrop.addEventListener('click', close);

      buildFabSheetContent();

      document.addEventListener('click', (e) => {
        const btn = e.target.closest('#fab-close');
        if (btn) close();
      });
    } else {
      buildFabSheetContent();
    }

    function buildFabSheetContent(){
      const sheet = document.getElementById('qc-sheet');
      if(!sheet) return;
      sheet.innerHTML = `
        <div class="row" style="justify-content:space-between">
          <strong>הוספת תגובה מהירה</strong>
          <button id="fab-close" class="close">סגור ✖</button>
        </div>
        <div class="row">
          <label style="white-space:nowrap;">הערה:</label>
          <input id="fab-input" type="text" placeholder="הוסף הערה...">
          <button id="fab-mic" class="mic" title="הכתבה קולית" aria-label="הכתבה קולית">🎤</button>
        </div>
        <div class="actions">
          <button id="fab-send" class="send" disabled>שמור</button>
        </div>`;

      const inputEl = document.getElementById('fab-input');
      const micBtn  = document.getElementById('fab-mic');
      const sendBtn = document.getElementById('fab-send');
      const backdrop= document.getElementById('qc-sheet-backdrop');
      const panel   = document.getElementById('qc-sheet');

      const toggleSend = ()=> sendBtn.disabled = inputEl.value.trim().length===0;
      inputEl.addEventListener('input', toggleSend);
      inputEl.addEventListener('keydown', e=>{
        if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); if(!sendBtn.disabled) doSend(); }
      });
      sendBtn.onclick = doSend;

      function doSend(){
        const txt = inputEl.value.trim();
        if(!txt) return;
        if(addCommentItem('GLOBAL', txt)){
          inputEl.value='';
          toggleSend();
          backdrop.style.display='none';
          panel.style.display='none';
          if(navigator.vibrate) navigator.vibrate(10);
        }
      }

      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      let recognition=null,isRecording=false;
      if (SR){
        recognition = new SR();
        recognition.lang='he-IL';
        recognition.continuous=false;
        recognition.interimResults=false;
        recognition.maxAlternatives=1;
        recognition.onresult = e=>{
          const t = e.results[0][0].transcript || '';
          inputEl.value = t;
          toggleSend();
        };
        recognition.onerror = ()=>{ isRecording=false; micBtn.classList.remove('recording'); micBtn.textContent='🎤'; };
        recognition.onend    = ()=>{ isRecording=false; micBtn.classList.remove('recording'); micBtn.textContent='🎤'; };
        const startRec = e=>{
          e.preventDefault();
          if(!isRecording){
            try{ recognition.start(); isRecording=true; micBtn.classList.add('recording'); micBtn.textContent='🛑'; }catch{}
          }
        };
        const stopRec = e=>{ e.preventDefault(); if(isRecording) recognition.stop(); };
        micBtn.addEventListener('mousedown', startRec);
        micBtn.addEventListener('mouseup', stopRec);
        micBtn.addEventListener('mouseleave', stopRec);
        micBtn.addEventListener('touchstart', startRec, { passive:false });
        micBtn.addEventListener('touchend', stopRec);
      } else {
        micBtn.title = 'הקלטה קולית דורשת דפדפן תומך';
      }
    }
  };

  function ensureCommentArray(key) {
    window.state = window.state || {};
    const gc = state.generalComments || (state.generalComments = {});
    const cur = gc[key];
    if (Array.isArray(cur)) return cur;
    if (typeof cur === 'string' && cur.trim()) {
      if (cur.includes(' | ')) {
        gc[key] = cur.split('|').map(s => s.trim()).filter(Boolean);
      } else {
        gc[key] = [cur.trim()];
      }
    } else if (!cur) {
      gc[key] = [];
    } else {
      gc[key] = [String(cur).trim()];
    }
    return gc[key];
  }

  function addCommentItem(key, text, opts = {}) {
    const t = (text || '').trim();
    if (!t) return false;
    const arr = ensureCommentArray(key);
    arr.unshift(t);
    if (opts.save !== false && typeof window.saveState === 'function') saveState();
    updateCommentButtonsFor(key);
    return true;
  }

  function getCommentCount(key){
    const raw = state.generalComments?.[key];
    if (!raw) return 0;
    if (Array.isArray(raw)) return raw.filter(c=>c && c.trim()).length;
    return String(raw).trim() ? 1 : 0;
  }

  function updateCommentButtonsFor(key) {
    const raw = state.generalComments?.[key];
    const arr = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    const summary = truncateAny(raw);
    const count = getCommentCount(key);
    const level = Math.min(count, 5);
    const levelClasses = ['comment-level-0','comment-level-1','comment-level-2','comment-level-3','comment-level-4','comment-level-5'];

    document.querySelectorAll(`[data-comment-btn="${key}"]`).forEach(btn => {
      btn.innerHTML = summary + ' ✎';
      const empty = !arr.some(c => c && c.trim());
      btn.classList.toggle('comment-btn-empty', empty);

      btn.classList.add('comment-btn','sprint-comment-btn');

      levelClasses.forEach(c => btn.classList.remove(c));
      btn.classList.add('comment-level-' + level);
    });
  }

  if (!NS.updateAllReportCommentButtons) {
    NS.updateAllReportCommentButtons = function(){
      const keys = Object.keys(state.generalComments || {});
      document.querySelectorAll('[data-comment-btn]').forEach(btn=>{
        const k = btn.getAttribute('data-comment-btn');
        updateCommentButtonsFor(k);
      });
    };
  }

  function truncateAny(raw, max = 24) {
    if (raw == null) return 'כתוב הערה...';
    let s;
    if (Array.isArray(raw)) {
      const c = raw.filter(x => x && x.trim());
      if (!c.length) return 'כתוב הערה...';
      s = c.join(' | ');
    } else {
      s = String(raw).trim();
      if (!s) return 'כתוב הערה...';
    }
    s = s.replace(/\s+/g, ' ');
    return s.length > max ? s.slice(0, max) + '…' : s;
  }

  (function migrateOnce() {
    if (window.__commentsMigrated) return;
    window.__commentsMigrated = true;
    if (!window.state?.generalComments) return;
    let changed = false;
    Object.entries(state.generalComments).forEach(([k, v]) => {
      if (typeof v === 'string' && v.includes(' | ')) {
        const parts = v.split('|').map(s => s.trim()).filter(Boolean);
        if (parts.length > 1) {
          state.generalComments[k] = parts;
          changed = true;
        }
      }
    });
    if (changed && typeof saveState === 'function') saveState();
  })();

  window.QuickComments.refresh = function(){
    const host = document.getElementById('quick-comment-bar-container');
    if (host) window.QuickComments.renderBar(true);
  };

})();