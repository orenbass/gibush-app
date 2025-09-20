(function () {
  window.Pages = window.Pages || {};
  
  function ensureReportCss() {
    let st = document.getElementById('report-cards-style');
    if(!st){
      st = document.createElement('style');
      st.id = 'report-cards-style';
      document.head.appendChild(st);
    }
    st.textContent = `
      .report-header-bar{
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center; /* מרכוז אופקי */
        gap:6px;
        margin:8px 0 32px; /* רווח שורה מתחת לכותרת */
        width:100%;
        text-align:center;
      }
      .report-header-bar h2{
        margin:0;
        font-size:26px;
        font-weight:700;
        color:#1e293b;
        line-height:1.25;
      }
      .dark .report-header-bar h2{color:#f1f5f9}

      /* כפתורי תחתית */
      .report-bottom-actions{
        display:flex;
        justify-content:space-between;
        gap:12px;
        max-width:980px;
        margin:28px auto 8px;
        width:100%;
      }
      .report-bottom-actions .report-btn{
        font-size:13px;
        font-weight:600;
        border:1px solid #cbd5e1;
        background:transparent;
        color:#334155;
        border-radius:10px;
        padding:9px 18px;
        cursor:pointer;
        display:inline-flex;
        align-items:center;
        gap:6px;
        white-space:nowrap;
        transition:.15s;
      }
      .report-bottom-actions .report-btn:hover{background:#e2e8f0}
      .dark .report-bottom-actions .report-btn{color:#e2e8f0;border-color:#475569}
      .dark .report-bottom-actions .report-btn:hover{background:#374151}
      @media (max-width:650px){
        .report-bottom-actions{flex-direction:column}
        .report-bottom-actions .report-btn{width:100%;justify-content:center}
      }

      .export-hint{font-size:11px;opacity:.6;text-align:center;margin:18px auto 4px;max-width:980px}
      .report-cards-grid{display:flex;flex-direction:column;gap:10px;max-width:980px;margin:0 auto 34px;padding:0}
      .runner-card-r{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px 12px 12px 16px;display:flex;flex-direction:column;gap:12px;position:relative;padding-right:60px}
      .runner-card-r:hover{box-shadow:0 2px 8px -2px rgba(0,0,0,.12)}
      .dark .runner-card-r{background:#1f2937;border-color:#334155}
      .rank-badge{position:absolute;top:0;right:0;width:50px;height:100%;border-radius:0 14px 14px 0;background:#6b7280;color:#fff;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;box-shadow:-2px 0 6px rgba(0,0,0,.15);z-index:10;flex-direction:column;gap:2px}
      .runner-card-r.gold .rank-badge{background:linear-gradient(180deg,#fbbf24,#d97706);color:#1f2937}
      .runner-card-r.silver .rank-badge{background:linear-gradient(180deg,#e5e7eb,#9ca3af);color:#1f2937}
      .runner-card-r.bronze .rank-badge{background:linear-gradient(180deg,#cd7c0f,#92400e);color:#fff}
      .rank-number{font-size:16px;font-weight:700;line-height:1}
      .rank-medal{font-size:24px;line-height:1}
      .shoulder-badge{position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:#fff;border:2px solid #e2e8f0;border-radius:8px;padding:3px 10px;z-index:10;box-shadow:0 2px 6px rgba(0,0,0,.15)}
      .dark .shoulder-badge{background:#1f2937;border-color:#334155;color:#f1f5f9}
      .runner-number-big{font-size:16px;font-weight:800;color:#0f172a;line-height:1;margin:0}
      .dark .runner-number-big{color:#f1f5f9}
      .scores-inline{display:grid;grid-template-columns:repeat(3, 1fr);gap:12px;justify-content:start;max-width:100%}
      .score-item{display:flex;flex-direction:column;align-items:center;gap:6px}
      .score-label{font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;text-align:center}
      .dark .score-label{color:#94a3b8}
      .score-input{width:48px;height:36px;border:2px solid #e2e8f0;border-radius:12px;text-align:center;font-size:15px;font-weight:700;background:#f8fafc;color:#1e293b;transition:all .2s ease;outline:none;box-shadow:0 1px 2px rgba(0,0,0,0.08)}
      .score-input:focus,.score-input:not([readonly]){border-color:#3b82f6;background:#fff;box-shadow:0 0 0 2px rgba(59,130,246,.1)}
      .dark .score-input{background:#374151;border-color:#475569;color:#f1f5f9}
      .dark .score-input:focus,.dark .score-input:not([readonly]){border-color:#60a5fa;background:#1f2937}
      .comment-trigger{display:flex;justify-content:center;margin-top:8px}
      .inactive-panel{max-width:980px;margin:34px auto 0}
      .inactive-grid{display:flex;flex-wrap:wrap;gap:8px}
      .inactive-chip{background:#e2e8f0;color:#334155;font-weight:600;padding:6px 12px;border-radius:24px;font-size:12px;display:inline-flex;align-items:center;gap:6px}
      .dark .inactive-chip{background:#374151;color:#e2e8f0}
      .runner-card-r.gold{box-shadow:0 0 0 2px #fbbf24 inset,0 2px 10px -3px rgba(251,191,36,.45)}
      .runner-card-r.silver{box-shadow:0 0 0 2px #9ca3af inset,0 2px 10px -3px rgba(156,163,175,.4)}
      .runner-card-r.bronze{box-shadow:0 0 0 2px #cd7c0f inset,0 2px 10px -3px rgba(205,124,15,.4)}
      .runner-card-r.gold .shoulder-badge{border-color:#fbbf24}
      .runner-card-r.silver .shoulder-badge{border-color:#9ca3af}
      .runner-card-r.bronze .shoulder-badge{border-color:#cd7c0f}
      .runner-card-r.gold .rank-badge,
      .runner-card-r.silver .rank-badge,
      .runner-card-r.bronze .rank-badge{
        font-size:34px;
      }
      @media (max-width:750px){
        .runner-card-r{padding-right:50px;gap:10px}
        .scores-inline{gap:8px}
        .score-input{width:42px;height:32px;font-size:14px}
        .score-label{font-size:10px}
        .rank-badge{width:40px}
        .runner-number-big{font-size:14px}
        .report-header-bar{flex-direction:column;align-items:flex-start}
        .runner-card-r.gold .rank-badge,
        .runner-card-r.silver .rank-badge,
        .runner-card-r.bronze .rank-badge{
          font-size:28px;
        }
      }
      @media (max-width:400px){
        .runner-card-r{padding-right:45px}
        .scores-inline{gap:6px}
        .score-input{width:38px;height:30px;font-size:13px}
        .score-label{font-size:9px}
        .rank-badge{width:35px}
        .runner-number-big{font-size:13px}
        .runner-card-r.gold .rank-badge,
        .runner-card-r.silver .rank-badge,
        .runner-card-r.bronze .rank-badge{
          font-size:24px;
        }
      }
    `;
  }

  function safeScore(fnName, runner) {
    try { if (typeof window[fnName] === 'function') return window[fnName](runner); } catch(e){ console.warn(e); }
    return 0;
  }

  function buildReportFileName() {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2,'0');
    const yy = String(now.getFullYear()).slice(-2);
    const groupNumber = state?.groupNumber || state?.currentGroup || '1';
    return `קבוצה-${groupNumber}_${mm}.${yy}.xlsx`;
  }

  function ensureCommentsModalLoaded() {
    return new Promise((resolve, reject) => {
      if (window.CommentsModal?.open) return resolve();
      if (document.querySelector('script[data-comments-modal]')) {
        const check = () => window.CommentsModal ? resolve() : setTimeout(check, 40);
        return check();
      }
      const s = document.createElement('script');
      s.src = 'js/components/commentsModal.js';
      s.async = true;
      s.dataset.commentsModal = 'true';
      s.onload = () => window.CommentsModal ? resolve() : reject(new Error('commentsModal.js loaded but window.CommentsModal missing'));
      s.onerror = () => reject(new Error('Failed loading commentsModal.js'));
      document.head.appendChild(s);
    });
  }

  function buildCommentButton(shoulderNumber){
    state.generalComments = state.generalComments || {};
    const raw = state.generalComments[shoulderNumber];
    let arr = Array.isArray(raw) ? raw.filter(c=>c && c.trim()) : (raw ? [String(raw).trim()] : []);
    const count = arr.length;
    const level = Math.min(count, 5);
    let text = 'כתוב הערה...';
    if (count > 0){
      const joined = arr.join(' | ');
      text = joined.length > 20 ? joined.slice(0,17)+'...' : joined;
    }
    return `
      <button type="button"
        class="comment-btn sprint-comment-btn comment-level-${level}"
        data-comment-btn="${shoulderNumber}"
        title="הערות (#${shoulderNumber}) – ${count} הערות">
        <span class="comment-text">${text}</span>
        <span class="comment-icon">✎</span>
      </button>`;
  }

  async function localOpenHandler(sn, btn){
    try{
      await ensureCommentsModalLoaded();
      window.CommentsModal.open(sn, { originBtn: btn });
    }catch(err){
      console.error(err);
      alert('שגיאה בפתיחת הערות');
    }
  }

  function triggerDownload(blob, filename) {
    window.GibushAppExporter.downloadFile(blob, filename);
  }

  // הוספת פונקציה לhודעות מערכת
  function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // אם יש מערכת התראות במערכת - השתמש בה
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
    } else if (typeof window.showMessage === 'function') {
      window.showMessage(message);
    } else {
      // Fallback - הצגת הודעה פשוטה
      const isError = type === 'error';
      if (isError) {
        console.error(message);
      }
      // אפשר להוסיף כאן toast או הודעה ויזואלית
    }
  }

  if (!window.__reportExportHelpersAdded) {
    window.__reportExportHelpersAdded = true;

    window.__ReportExport = {
      triggerDownload,
    };
  }

  window.Pages.renderReportPage = function renderReportPage() {
    // NEW: וידוא שכל הציונים מעודכנים לפני הצגת הדוח
    if (typeof window.updateAllSprintScores === 'function') {
      window.updateAllSprintScores();
    }

    const contentDiv = document.getElementById('content');
    if (!contentDiv) return console.error("renderReportPage: לא נמצא האלמנט #content");
    
    ensureReportCss();

    state.manualScores = state.manualScores || {};
    state.generalComments = state.generalComments || {};
    const runnersArr = Array.isArray(state.runners) ? state.runners : [];

    const allRunners = runnersArr.map(r => {
      const status = state.crawlingDrills?.runnerStatuses?.[r.shoulderNumber] || 'פעיל';
      let sprintScore = 0, crawlingScore = 0, stretcherScore = 0, totalScore = -1;
      if (status === 'פעיל') {
        const manual = state.manualScores[r.shoulderNumber];
        sprintScore = manual?.sprint ?? safeScore('calculateSprintFinalScore', r);
        // UPDATED: שימוש בפונקציה החדשה לחישוב ציון זחילה סופי
        crawlingScore = manual?.crawl ?? safeScore('calculateCrawlingFinalScore', r);
        stretcherScore = manual?.stretcher ?? safeScore('calculateStretcherFinalScore', r);
        totalScore = sprintScore + crawlingScore + stretcherScore;
      }
      return { ...r, sprintScore, crawlingScore, stretcherScore, status, totalScore };
    });

    const active = allRunners.filter(r => r.status === 'פעיל').sort((a, b) => b.totalScore - a.totalScore);
    const inactive = allRunners.filter(r => r.status !== 'פעיל');

    const getCardClass = i => i===0?'gold':i===1?'silver':i===2?'bronze':'';
    const getRankDisplay = rank => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;

    contentDiv.innerHTML = `
      <div class="report-header-bar">
        <h2>דוח סיכום</h2>
      </div>
      <div class="report-cards-grid">
        ${active.map((r,i) => `
            <div class="runner-card-r ${getCardClass(i)}" data-card="${r.shoulderNumber}">
              <div class="rank-badge" title="דירוג">${getRankDisplay(i+1)}</div>
              <div class="shoulder-badge">
                <div class="runner-number-big" title="מספר כתף">#${r.shoulderNumber}</div>
              </div>
              <div class="scores-inline">
                <div class="score-item">
                  <div class="score-label">ספרינט</div>
                  <input class="score-input" type="tel" value="${r.sprintScore}" data-shoulder="${r.shoulderNumber}" data-type="sprint">
                </div>
                <div class="score-item">
                  <div class="score-label">זחילה</div>
                  <input class="score-input" type="tel" value="${r.crawlingScore}" data-shoulder="${r.shoulderNumber}" data-type="crawl">
                </div>
                <div class="score-item">
                  <div class="score-label">${(CONFIG?.STRETCHER_PAGE_LABEL || 'אלונקה').replace('אלונקה','אלונקות')}</div>
                  <input class="score-input" type="tel" value="${r.stretcherScore}" data-shoulder="${r.shoulderNumber}" data-type="stretcher">
                </div>
              </div>
              <div class="comment-trigger">${buildCommentButton(r.shoulderNumber)}</div>
            </div>
          `).join('')}
      </div>
      ${inactive.length ? `
        <div class="inactive-panel">
          <h3 style="margin:28px 0 14px;font-size:18px;font-weight:700;text-align:center;color:#334155">מספרי כתף שאינם פעילים</h3>
          <div class="inactive-grid">
            ${inactive.map(r => `<div class="inactive-chip"><strong>#${r.shoulderNumber}</strong> <span class="status">${r.status === 'temp_removed' ? 'גריעה זמנית' : 'פרש'}</span></div>`).join('')}
          </div>
        </div>` : ''}

      <div class="export-hint">עדכון ציון: יציאה מהשדה שומר. עריכת הערה: לחיצה על כפתור ההערה.</div>

      <div class="report-bottom-actions">
        <button id="upload-drive-btn" class="report-btn">📤 שלח קובץ למנהל</button>
        <button id="export-excel-btn" class="report-btn">💾 הורדת אקסל</button>
      </div>
    `;

    window.Pages.initReportPageListeners();
  };

  // Helper: בדיקת משתמש אורח
  function isGuestUser(){
    try {
      const saved = localStorage.getItem('gibushAuthState');
      if(!saved) return true;
      const session = JSON.parse(saved);
      return session?.authState?.authMethod === 'guest';
    } catch(e){ return true; }
  }

  async function handleDriveUploadClick(btn) {
    // דרישת סיסמה אם אורח
    if (isGuestUser() && !sessionStorage.getItem('reportDriveApproved')) {
      const pwd = prompt('הזן סיסמת מנהל לשליחת הקובץ:');
      if (pwd === null) return; // ביטול
      const adminPwd = (window.ADMIN_PASSWORD || typeof ADMIN_PASSWORD !== 'undefined' && ADMIN_PASSWORD) || '';
      if (pwd !== adminPwd) {
        alert('סיסמה שגויה');
        return;
      }
      sessionStorage.setItem('reportDriveApproved','1');
    }
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'מכין קובץ...';
    try {
      if (typeof window.GibushAppExporter?.exportReport === 'function') {
        await window.GibushAppExporter.exportReport('drive');
        btn.textContent = 'נשלח בהצלחה ✔';
      } else {
        throw new Error('מערכת הייצוא לא זמינה');
      }
    } catch (e) {
      console.error(e);
      btn.textContent = 'שגיאה - שמירה מקומית';
      try {
        if (typeof window.GibushAppExporter?.exportReport === 'function') {
          await window.GibushAppExporter.exportReport('download');
        }
      } catch (downloadError) {
        alert('שגיאה בשמירת הקובץ: ' + downloadError.message);
      }
    } finally {
      setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1800);
    }
  }

  function handleExcelDownloadClick(e) {
    e.preventDefault();
    
    // שימוש במערכת הייצוא המאוחדת החדשה
    if (typeof window.GibushAppExporter?.exportReport === 'function') {
      window.GibushAppExporter.exportReport('download')
        .then(result => {
          console.log('הורדת דוח הושלמה:', result.filename);
          showNotification('✅ קובץ הדוח הורד בהצלחה!', 'success');
        })
        .catch(error => {
          console.error('שגיאה בהורדת דוח:', error);
          showNotification('❌ שגיאה בהורדת הדוח: ' + error.message, 'error');
        });
    } else {
      console.error('מערכת הייצוא לא זמינה');
      showNotification('❌ מערכת הייצוא לא זמינה', 'error');
    }
  }

  window.Pages.initReportPageListeners = function initReportPageListeners() {
    const contentDiv = document.getElementById('content');
    if (!contentDiv || contentDiv.dataset.reportListenersAttached) return;
    contentDiv.dataset.reportListenersAttached = 'true';

    contentDiv.addEventListener('click', async (e) => {
      const uploadBtn = e.target.closest('#upload-drive-btn');
      if (uploadBtn) return await handleDriveUploadClick(uploadBtn);
      
      const exportBtn = e.target.closest('#export-excel-btn');
      if (exportBtn) return handleExcelDownloadClick(e);

      const commentBtn = e.target.closest('[data-comment-btn]');
      if (commentBtn) return localOpenHandler(commentBtn.dataset.commentBtn, commentBtn);
    });

    contentDiv.addEventListener('blur', (e) => {
      const input = e.target.closest('.score-input');
      if (!input) return;
      
      let v = parseInt(input.value, 10);
      if (isNaN(v)) v = parseInt(input.dataset.prev, 10) || 1;
      v = Math.min(7, Math.max(1, v));
      
      if (v !== parseInt(input.dataset.prev, 10)) {
        const shoulder = input.dataset.shoulder;
        const type = input.dataset.type;
        state.manualScores[shoulder] = state.manualScores[shoulder] || {};
        state.manualScores[shoulder][type] = v;
        saveState();
        window.Pages.renderReportPage(); // רינדור מחדש לסידור הדירוג
      } else {
        input.value = v; // החזרת ערך תקין אם הוזן משהו לא חוקי
      }
    }, true); // שימוש ב-capture
  };

  window.handleDriveUploadClick = handleDriveUploadClick;
  window.handleExcelDownloadClick = handleExcelDownloadClick;

})();