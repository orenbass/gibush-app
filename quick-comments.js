(function () {
  'use strict';
  const NS = (window.QuickComments = window.QuickComments || {});

  // תגובה מהירה – סרגל עליון
  NS.renderBar = function renderQuickCommentBar(show) {
    const quickBarDiv = document.getElementById('quick-comment-bar-container');
    if (!quickBarDiv) return;
    if (!show) { quickBarDiv.innerHTML = ''; return; }

    // CSS חד-פעמי
    if (!document.getElementById('qc-style')) {
      const style = document.createElement('style');
      style.id = 'qc-style';
      style.textContent = `
.quickbar { 
  display: grid; 
  grid-template-columns: 1fr; 
  gap: 10px; 
  padding: 12px;
  background: rgba(0,0,0,.08);
  border-radius: 12px;
  margin: 8px 0;
}
@media (min-width: 640px) {
  .quickbar { 
    grid-template-columns: auto 1fr auto; 
    align-items: center; 
    gap: 12px; 
  }
}
.qc-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.qc-label { font-size: 14px; font-weight: 600; color: inherit; white-space: nowrap; min-width: fit-content; }
.qc-runner-select { width: 80px; height: 40px; text-align: center; text-align-last: center; font-weight: 600; border-radius: 8px; border: 1px solid rgba(0,0,0,.15); background: #ffffff; color: #111827; }
.dark .qc-runner-select { background: #374151; color: #f9fafb; border-color: rgba(255,255,255,.2); }
.qc-runner-select option { background: #ffffff; color: #111827; }
.dark .qc-runner-select option { background: #374151; color: #f9fafb; }
.qc-input-row { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.qc-input { flex: 1; height: 40px; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(0,0,0,.15); background: rgba(255,255,255,.9); color: #111827; font-size: 16px; text-align: right; min-width: 0; }
.dark .qc-input { background: rgba(255,255,255,.06); color: inherit; border-color: rgba(255,255,255,.14); }
.qc-micBtn { width: 40px; height: 40px; border-radius: 8px; border: 1px solid rgba(0,0,0,.15); background: #374151; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
.qc-micBtn:hover { background: #4b5563; }
.qc-micBtn.recording { background: #ef4444; border-color: #dc2626; }
.qc-sendBtn { height: 40px; padding: 0 16px; border-radius: 8px; border: none; background: #10b981; color: #fff; font-weight: 600; cursor: pointer; flex-shrink: 0; }
.qc-sendBtn:disabled { opacity: .5; cursor: not-allowed; }
.qc-sendBtn:not(:disabled):hover { background: #059669; }`;
      document.head.appendChild(style);
    }

    // קומפקט – הקטנת רכיבי שורה עליונה במסכים צרים
    if (!document.getElementById('qc-style-compact')) {
      const compact = document.createElement('style');
      compact.id = 'qc-style-compact';
      compact.textContent = `
.qc-row{flex-wrap:wrap} /* <--- שנה את השורה הזו */
.qc-runner-select{width:64px; height:32px; font-size:14px}
.qc-sendBtn{height:32px; padding:0 10px; font-size:14px}
.qc-input{height:32px; font-size:14px}
.qc-micBtn{width:32px; height:32px; font-size:16px}
#group-comments-select.qc-group-select{
  height:32px; min-width:7rem; width:8.5rem; padding:0 6px; font-size:12px;
  border:1px solid rgba(0,0,0,.15); border-radius:8px; background:#fff; color:#111827;
  box-sizing:border-box; direction:rtl;
}
.dark #group-comments-select.qc-group-select{
  background:#374151; color:#f9fafb; border-color:rgba(255,255,255,.2)
}
      `;
      document.head.appendChild(compact);
    }

    const runnerOptionsArr = (window.state?.runners || [])
      .slice()
      .sort((a, b) => a.shoulderNumber - b.shoulderNumber)
      .map(r => `<option value="${r.shoulderNumber}">${r.shoulderNumber}</option>`);

    const hasRunners = runnerOptionsArr.length > 0;
    const runnerOptions = hasRunners
      ? runnerOptionsArr.join('')
      : '<option value="" disabled selected>אין מתמודדים</option>';

    // בניית אפשרויות להערות קבוצה מה־CONFIG
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

    quickBarDiv.innerHTML = `
      <div class="quickbar" role="region" aria-label="הערה מהירה">
        <div class="qc-row">
          <span class="qc-label">מס' כתף:</span>
          <select id="quick-comment-runner" class="qc-runner-select" aria-label="בחר מספר כתף" ${hasRunners ? '' : 'disabled'}>${runnerOptions}</select>

          <!-- הדרופדאון של ההערה המהירה באמצע -->
          <select id="group-comments-select" class="qc-group-select" aria-label="הערה מהירה">
            ${buildGroupOptions()}
          </select>

          <button id="quick-comment-send" class="qc-sendBtn" disabled>שלח</button>
        </div>
        <div class="qc-row">
          <span class="qc-label">הערה:</span>
          <div class="qc-input-row">
            <input id="quick-comment-input" type="text" class="qc-input" placeholder="הערה מהירה">
            <button id="quick-comment-mic" class="qc-micBtn" aria-label="הכתבה קולית" title="הכתבה קולית">🎤</button>
          </div>
        </div>
      </div>`;

    const selectEl = document.getElementById('quick-comment-runner');
    const inputEl  = document.getElementById('quick-comment-input');
    const micBtn   = document.getElementById('quick-comment-mic');
    const sendBtn  = document.getElementById('quick-comment-send');
    const groupSel = document.getElementById('group-comments-select');

    const updateSendEnabled = () => { sendBtn.disabled = inputEl.value.trim().length === 0; };
    inputEl.addEventListener('input', updateSendEnabled);
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) send();
      }
    });

    // בחירת פריט מהרשימה הנפתחת – מזריק לטקסט ושומר על קומפקטיות
    if (groupSel) {
      groupSel.addEventListener('change', () => {
        const v = groupSel.value || '';
        if (!v || !inputEl) return;
        inputEl.value = (inputEl.value ? inputEl.value.trimEnd() + ' ' : '') + v;
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        groupSel.selectedIndex = 0; // חזרה ל"הערה מהירה"
        inputEl.focus();
      });
    }

    function send() {
      const selected = selectEl.value;
      const text = inputEl.value.trim();
      if (!selected || !text) return;
      const gc = window.state.generalComments || (window.state.generalComments = {});
      if (gc[selected]) gc[selected] += ' | ' + text; else gc[selected] = text;
      window.saveState?.();
      window.render?.();
      if (navigator.vibrate) navigator.vibrate(10);
      inputEl.value = '';
      inputEl.placeholder = 'נשמר!';
      updateSendEnabled();
      setTimeout(() => { inputEl.placeholder = 'הערה מהירה'; }, 900);
    }
    sendBtn.addEventListener('click', send);

    // הכתבה קולית
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null, isRecording = false;

    // Force hide on Apple devices
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

  // תגובה מהירה – FAB
  NS.renderFAB = function renderQuickCommentFAB(show) {
    // CSS חד-פעמי
    if (!document.getElementById('qc-fab-style')) {
      const s = document.createElement('style');
      s.id = 'qc-fab-style';
      s.textContent = `
.qc-fab{position:fixed; inset-inline-end:16px; bottom:16px; width:56px; height:56px; border-radius:50%;
  background:#2563eb; color:#fff; display:flex; align-items:center; justify-content:center;
  box-shadow:0 10px 28px rgba(0,0,0,.3); z-index:1000; cursor:pointer; border:none; font-size:24px;}
.qc-fab:hover{background:#1d4ed8}
.qc-sheet-backdrop{position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:999; display:none;}
.qc-sheet{position:fixed; bottom:84px; inset-inline-end:16px; width:min(440px,94vw);
  background:#ffffff; color:#111827; border-radius:14px; padding:12px 12px 10px; 
  box-shadow:0 14px 36px rgba(0,0,0,.35); border:1px solid #d1d5db; z-index:1001; display:none;}
.dark .qc-sheet{background:#111827; color:#f3f4f6; border-color:#374151;}
.qc-sheet .row{display:flex; align-items:center; gap:8px; margin:8px 0}
.qc-sheet select, .qc-sheet input{flex:1 1 auto; height:44px; border-radius:10px; border:1px solid rgba(0,0,0,.15);
  padding:8px 12px; font-size:16px; box-sizing:border-box; background:#ffffff; color:#111827;}
.dark .qc-sheet select, .dark .qc-sheet input{background:#1f2937; color:#f3f4f6; border-color:#374151;}
.qc-sheet .mic{width:42px; height:42px; border-radius:10px; border:1px solid rgba(0,0,0,.15);
  background:#374151; color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer;}
.qc-sheet .mic.recording{background:#ef4444; border-color:#dc2626}
.qc-sheet .actions{display:flex; justify-content:flex-start; gap:8px; margin-top:6px}
.qc-sheet .send{background:#10b981; color:#fff; border:none; padding:10px 16px; border-radius:10px; cursor:pointer; font-weight:600}
.qc-sheet .send:disabled{opacity:.5; cursor:not-allowed}
.qc-sheet .close{margin-inline-start:auto; background:#e5e7eb; border:none; border-radius:10px; padding:8px 10px; cursor:pointer}
.dark .qc-sheet .close{background:#374151; color:#e5e7eb}
.qc-sheet select{ text-align:center; text-align-last:center; }
            .quick-comment-bar {
                /* ... existing styles ... */
            }
            .qc-controls {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap; /* הוסף את השורה הזו */
            }
            /* ... a lot of other existing styles ... */
        `;
      document.head.appendChild(s);
    }

    // ניקוי כשלא מציגים
    if (!show) {
      document.getElementById('qc-fab')?.remove();
      document.getElementById('qc-sheet')?.remove();
      document.getElementById('qc-sheet-backdrop')?.remove();
      return;
    }

    // יצירה חד-פעמית
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

      // ציור התוכן + מאזינים
      buildFabSheetContent();

      // כפתור סגירה
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('#fab-close');
        if (btn) close();
      });
    } else {
      // עדכון הרשימה בכל רינדור
      buildFabSheetContent();
    }

    function buildFabSheetContent() {
      const runnerOptions = (window.state?.runners || [])
        .slice()
        .sort((a, b) => a.shoulderNumber - b.shoulderNumber)
        .map(r => `<option value="${r.shoulderNumber}">${r.shoulderNumber}</option>`).join('');

      const sheet = document.getElementById('qc-sheet');
      if (!sheet) return;

      sheet.innerHTML = `
        <div class="row" style="justify-content:space-between">
          <strong>הוספת תגובה מהירה</strong>
          <button id="fab-close" class="close">סגור ✖</button>
        </div>
        <div class="row">
          <label style="white-space:nowrap;">מס' כתף:</label>
          <select id="fab-runner">${runnerOptions}</select>
        </div>
        <div class="row">
          <label style="white-space:nowrap;">הערה:</label>
          <input id="fab-input" type="text" placeholder="הוסף הערה...">
          <button id="fab-mic" class="mic" title="הכתבה קולית" aria-label="הכתבה קולית">🎤</button>
        </div>
        <div class="actions">
          <button id="fab-send" class="send" disabled>שמור</button>
        </div>`;

      const selectEl = document.getElementById('fab-runner');
      const inputEl = document.getElementById('fab-input');
      const micBtn = document.getElementById('fab-mic');
      const sendBtn = document.getElementById('fab-send');

      const updateSendEnabled = () => { sendBtn.disabled = inputEl.value.trim().length === 0; };
      inputEl.addEventListener('input', updateSendEnabled);
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!sendBtn.disabled) doSend(); }
      });
      sendBtn.onclick = doSend;

      function doSend() {
        const shoulder = selectEl.value;
        const text = inputEl.value.trim();
        if (!shoulder || !text) return;
        const gc = window.state.generalComments || (window.state.generalComments = {});
        if (gc[shoulder]) gc[shoulder] += ' | ' + text; else gc[shoulder] = text;
        window.saveState?.();
        inputEl.value = '';
        updateSendEnabled();
        document.getElementById('qc-sheet-backdrop').style.display = 'none';
        document.getElementById('qc-sheet').style.display = 'none';
        if (navigator.vibrate) navigator.vibrate(10);
        window.render?.();
      }

      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      let recognition = null, isRecording = false;

      if (SR) {
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
      } else {
        micBtn.title = "הקלטה קולית דורשת דפדפן תומך ו-HTTPS";
      }
    }
  };
})();
