(function () {
  window.Pages = window.Pages || {};
  const contentDiv = document.getElementById('content');

  function ensureReportCss() {
    let st = document.getElementById('report-cards-style');
    if(!st){
      st = document.createElement('style');
      st.id = 'report-cards-style';
      document.head.appendChild(st);
    }
    st.textContent = `
      .report-header-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin:8px 0 18px}
      .report-header-bar h2{margin:0;font-size:22px;font-weight:700;color:#1e293b}
      .dark .report-header-bar h2{color:#f1f5f9}
      .control-buttons{display:flex;flex-wrap:wrap;gap:10px}
      .btn{font-size:13px;font-weight:600;border:0;border-radius:10px;padding:9px 18px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:.15s;line-height:1}
      .btn-outline{background:transparent;color:#334155;border:1px solid #cbd5e1}
      .btn-outline:hover{background:#e2e8f0}
      .dark .btn-outline{color:#e2e8f0;border-color:#475569}
      .dark .btn-outline:hover{background:#374151}
      .export-hint{font-size:11px;opacity:.6;text-align:center;margin:18px auto 8px;max-width:980px}

      .report-cards-grid{display:flex;flex-direction:column;gap:10px;max-width:980px;margin:0 auto 34px;padding:0}
      .runner-card-r{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px 12px 12px 16px;display:flex;flex-direction:column;gap:12px;min-height:auto;position:relative;padding-right:60px}
      .runner-card-r:hover{box-shadow:0 2px 8px -2px rgba(0,0,0,.12)}
      .dark .runner-card-r{background:#1f2937;border-color:#334155}
      
      .card-head{display:flex;align-items:center;gap:10px}
      
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
      .score-input:hover{border-color:#cbd5e1}
      .dark .score-input{background:#374151;border-color:#475569;color:#f1f5f9}
      .dark .score-input:focus,.dark .score-input:not([readonly]){border-color:#60a5fa;background:#1f2937}
      .dark .score-input:hover{border-color:#64748b}

      .comment-trigger{display:flex;justify-content:center;margin-top:8px}
      .comment-btn{background:#2563eb;color:#fff;font-weight:500;font-size:11px;border:0;border-radius:8px;padding:6px 10px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:.15s}
      .comment-btn:hover{background:#1d4ed8}
      .dark .comment-btn{background:#1d4ed8}
      .dark .comment-btn:hover{background:#1e40af}
      .comment-btn-empty{opacity:.75;font-style:italic}
      .comment-btn-empty:hover{opacity:1;font-style:normal}

      .inactive-panel{max-width:980px;margin:34px auto 0}
      .inactive-grid{display:flex;flex-wrap:wrap;gap:8px}
      .inactive-chip{background:#e2e8f0;color:#334155;font-weight:600;padding:6px 12px;border-radius:24px;font-size:12px;display:inline-flex;align-items:center;gap:6px}
      .inactive-chip span.status{font-size:10px;opacity:.75;font-weight:500}
      .dark .inactive-chip{background:#374151;color:#e2e8f0}

      /* Modal */
      .comment-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:flex-start;justify-content:center;overflow:auto;z-index:1000;padding:40px 18px}
      .comment-modal{background:#ffffff;max-width:500px;width:100%;border-radius:16px;padding:18px 18px 14px;box-shadow:0 4px 18px -2px rgba(0,0,0,.25);animation:cmIn .18s ease}
      .dark .comment-modal{background:#1f2937;color:#e2e8f0}
      @keyframes cmIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      .comment-modal h3{margin:0 0 4px;font-size:16px;font-weight:700}
      .comment-modal textarea{width:100%;min-height:160px;resize:vertical;border:1px solid #cbd5e1;padding:10px 12px;border-radius:10px;font-size:14px;background:#f8fafc;color:#1e293b}
      .dark .comment-modal textarea{background:#374151;border-color:#475569;color:#f1f5f9}
      .comment-modal .modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:12px}
      .note-muted{font-size:11px;opacity:.65;margin-top:4px}

      .runner-card-r.gold{box-shadow:0 0 0 2px #fbbf24 inset,0 2px 10px -3px rgba(251,191,36,.45)}
      .runner-card-r.silver{box-shadow:0 0 0 2px #9ca3af inset,0 2px 10px -3px rgba(156,163,175,.4)}
      .runner-card-r.bronze{box-shadow:0 0 0 2px #cd7c0f inset,0 2px 10px -3px rgba(205,124,15,.4)}
      
      .runner-card-r.gold .shoulder-badge{border-color:#fbbf24}
      .runner-card-r.silver .shoulder-badge{border-color:#9ca3af}
      .runner-card-r.bronze .shoulder-badge{border-color:#cd7c0f}

      /* רספונסיבי למסכים צרים */
      @media (max-width:750px){
        .runner-card-r{padding:14px 10px 10px 14px;padding-right:50px;gap:10px}
        .scores-inline{grid-template-columns:repeat(3, 1fr);gap:8px}
        .score-input{width:42px;height:32px;font-size:14px}
        .score-label{font-size:10px}
        .comment-btn{font-size:10px;padding:5px 8px}
        .rank-badge{width:40px;font-size:13px}
        .shoulder-badge{padding:2px 8px}
        .runner-number-big{font-size:14px}
        .report-header-bar{flex-direction:column;align-items:flex-start}
      }

      /* עבור מסכים קטנים מאוד (iPhone SE וכדומה) */
      @media (max-width:400px){
        .runner-card-r{padding:12px 8px 8px 12px;padding-right:45px}
        .scores-inline{gap:6px}
        .score-input{width:38px;height:30px;font-size:13px}
        .score-label{font-size:9px}
        .comment-btn{font-size:9px;padding:4px 6px;gap:2px}
        .rank-badge{width:35px;font-size:12px}
        .shoulder-badge{padding:2px 6px;top:-8px}
        .runner-number-big{font-size:13px}
      }

      /* === Shoulder badge alignment tweak === */
      .runner-card-r { --content-offset:60px; padding-right: var(--content-offset); }
      @media (max-width:750px){ .runner-card-r { --content-offset:50px; } }
      @media (max-width:400px){ .runner-card-r { --content-offset:45px; } }
      .runner-card-r .shoulder-badge{
        left: calc(50% - (var(--content-offset) / 2));
        transform: translateX(-50%);
      }
    `;
  }

  function ensureAdminCss() {
    let st = document.getElementById('admin-style');
    if(!st){
      st = document.createElement('style');
      st.id = 'admin-style';
      document.head.appendChild(st);
    }
    st.textContent = `
      /* CSS קיים... */
      
      .admin-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        flex-wrap: wrap;
        gap: 12px;
      }
      
      .sync-controls {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      
      .sync-status-panel {
        margin-top: 20px;
        padding: 12px 16px;
        border-radius: 8px;
        font-weight: 500;
      }
      
      .sync-status-panel.success {
        background: #dcfce7;
        color: #166534;
        border: 1px solid #bbf7d0;
      }
      
      .sync-status-panel.error {
        background: #fef2f2;
        color: #dc2626;
        border: 1px solid #fecaca;
      }
      
      .sync-status-panel.info {
        background: #dbeafe;
        color: #1d4ed8;
        border: 1px solid #bfdbfe;
      }
      
      @media (max-width: 600px) {
        .admin-header {
          flex-direction: column;
          align-items: stretch;
        }
        
        .sync-controls {
          justify-content: center;
        }
      }
    `;
  }

  function truncateComment(str, max = 24) {
    if (!str || !str.trim()) return 'כתוב הערה...'; // placeholder במקום '—'
    const c = str.replace(/\s+/g, ' ').trim();
    return c.length > max ? c.slice(0, max) + '…' : c;
  }

  function openCommentModal(shoulderNumber) {
    document.querySelector('.comment-modal-backdrop')?.remove();
    const current = (state.generalComments && state.generalComments[shoulderNumber]) || '';
    let draft = current;
    const backdrop = document.createElement('div');
    backdrop.className = 'comment-modal-backdrop';
    backdrop.innerHTML = `
      <div class="comment-modal" role="dialog" aria-modal="true">
        <header style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <h3>הערה – מס' כתף ${shoulderNumber}</h3>
          <button class="btn-outline btn" data-close style="padding:4px 10px;font-size:14px">✕</button>
        </header>
        <div class="modal-body">
          <textarea id="comment-editor" placeholder="כתוב הערה כללית...">${current}</textarea>
          <div class="note-muted">הערה זו תוצג בדוח המסכם ובמסכי ההדפסה.</div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" data-cancel>ביטול</button>
          <button class="btn" data-save style="background:#059669;color:#fff">שמור</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    const textarea = backdrop.querySelector('#comment-editor');
    if (textarea) {
      textarea.addEventListener('input', e => draft = e.target.value);
      setTimeout(() => textarea.focus(), 40);
    }

    function closeModal() { backdrop.remove(); }
    function confirmDiscard() {
      return draft !== current ? confirm('השינויים לא ישמרו. לצאת?') : true;
    }

    backdrop.addEventListener('click', e => {
      if (e.target === backdrop && confirmDiscard()) closeModal();
    });
    backdrop.querySelector('[data-close]').addEventListener('click', () => {
      if (confirmDiscard()) closeModal();
    });
    backdrop.querySelector('[data-cancel]').addEventListener('click', () => {
      if (confirmDiscard()) closeModal();
    });
    backdrop.querySelector('[data-save]').addEventListener('click', () => {
      state.generalComments = state.generalComments || {};
      state.generalComments[shoulderNumber] = draft.trim();
      saveState();
      closeModal();
      window.Pages.renderReportPage();
    });
  }

  function safeScore(fnName, runner) {
    try { if (typeof window[fnName] === 'function') return window[fnName](runner); } catch(e){ console.warn(e); }
    return 0;
  }

  if (typeof window.exportToExcel !== 'function') {
    window.exportToExcel = () => alert('פונקציית ייצוא לאקסל טרם הוגדרה.');
  }

  function buildReportFileName() {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2,'0');
    const yy = String(now.getFullYear()).slice(-2);
    const groupNumber =
      state?.groupNumber ||
      state?.currentGroup ||
      state?.group ||
      (state?.runners && state.runners[0]?.group) ||
      (state?.runners && state.runners[0]?.groupId) ||
      '1';
    return `קבוצה-${groupNumber}_${mm}.${yy}.xlsx`;
  }

  /**
   * פונקציית הרינדור הראשית - אחראית רק על יצירת ה-HTML
   */
  window.Pages.renderReportPage = function renderReportPage() {
    const contentDiv = document.getElementById('content');
    if (!contentDiv) {
      console.error("renderReportPage: לא נמצא האלמנט #content");
      return;
    }
    ensureReportCss();
    if (window.headerTitle) window.headerTitle.textContent = 'דוח מסכם';

    // --- לוגיקת חישוב נתונים (נשארת זהה) ---
    state.manualScores = state.manualScores || {};
    state.generalComments = state.generalComments || {};
    state.crawlingDrills = state.crawlingDrills || { runnerStatuses: {} };
    state.crawlingDrills.runnerStatuses = state.crawlingDrills.runnerStatuses || {};

    const runnersArr = Array.isArray(state.runners) ? state.runners : [];

    const allRunners = runnersArr.map(r => {
      const status = state.crawlingDrills.runnerStatuses[r.shoulderNumber] || 'פעיל';
      let sprintScore = 0, crawlingScore = 0, stretcherScore = 0, totalScore = -1;
      if (status === 'פעיל') {
        const baseSprint = safeScore('calculateSprintFinalScore', r);
        const baseCrawl = safeScore('calculateCrawlingFinalScore', r);
        const baseStretcher = safeScore('calculateStretcherFinalScore', r);
        const manual = state.manualScores[r.shoulderNumber];
        sprintScore = typeof manual?.sprint === 'number' ? manual.sprint : baseSprint;
        crawlingScore = typeof manual?.crawl === 'number' ? manual.crawl : baseCrawl;
        stretcherScore = typeof manual?.stretcher === 'number' ? manual.stretcher : baseStretcher;
        totalScore = sprintScore + crawlingScore + stretcherScore;
      }
      return { shoulderNumber: r.shoulderNumber, sprintScore, crawlingScore, stretcherScore, status, totalScore };
    });

    const active = allRunners.filter(r => r.status === 'פעיל')
      .sort((a, b) => b.totalScore - a.totalScore);
    const inactive = allRunners.filter(r => r.status !== 'פעיל');

    const getCardClass = i => i===0?'gold':i===1?'silver':i===2?'bronze':'';

    const getRankDisplay = (rank) => {
      if (rank === 1) return { medal: '🥇', showNumber: false };
      if (rank === 2) return { medal: '🥈', showNumber: false };
      if (rank === 3) return { medal: '🥉', showNumber: false };
      return { medal: '', showNumber: true, number: rank.toString() };
    };

    // --- יצירת ה-HTML ---
    contentDiv.innerHTML = `
      <div class="report-header-bar">
        <h2>סיכום ציונים – רצים פעילים</h2>
        <div class="control-buttons">
          <button id="upload-drive-btn" class="btn btn-outline">📤שלח קובץ למנהל</button>
          <button id="export-excel-btn" class="btn btn-outline">💾 הורדת אקסל</button>
        </div>
      </div>

      <div class="report-cards-grid">
        ${active.map((r,i) => {
          const rankDisplay = getRankDisplay(i + 1); // תיקון: היה חסר
          const rawComment = state.generalComments[r.shoulderNumber] || '';
          const hasComment = !!rawComment.trim();
          const commentDisplay = truncateComment(rawComment);
          return `
            <div class="runner-card-r ${getCardClass(i)}" data-card="${r.shoulderNumber}">
              <div class="rank-badge" title="דירוג">
                ${rankDisplay.medal ? `<div class="rank-medal">${rankDisplay.medal}</div>` : ''}
                ${rankDisplay.showNumber ? `<div class="rank-number">${rankDisplay.number}</div>` : ''}
              </div>
              <div class="shoulder-badge">
                <div class="runner-number-big" title="מספר כתף">#${r.shoulderNumber}</div>
              </div>
              <div class="scores-inline">
                <div class="score-item">
                  <div class="score-label">ספרינט</div>
                  <input class="score-input" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off"
                    data-min="1" data-max="7" aria-label="ציון ספרינט"
                    value="${r.sprintScore}" data-shoulder="${r.shoulderNumber}"
                    data-type="sprint">
                </div>
                <div class="score-item">
                  <div class="score-label">זחילה</div>
                  <input class="score-input" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off"
                    data-min="1" data-max="7" aria-label="ציון זחילה"
                    value="${r.crawlingScore}" data-shoulder="${r.shoulderNumber}"
                    data-type="crawl">
                </div>
                <div class="score-item">
                  <div class="score-label">${(CONFIG?.STRETCHER_PAGE_LABEL || 'אלונקה').replace('אלונקה','אלונקות')}</div>
                  <input class="score-input" type="tel" inputmode="numeric" pattern="[0-9]*" autocomplete="off"
                    data-min="1" data-max="7" aria-label="ציון אלונקות"
                    value="${r.stretcherScore}" data-shoulder="${r.shoulderNumber}"
                    data-type="stretcher">
                </div>
              </div>
              <div class="comment-trigger">
                <button class="comment-btn ${hasComment ? '' : 'comment-btn-empty'}" data-comment-btn="${r.shoulderNumber}">
                  ${commentDisplay} ✎
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      ${inactive.length ? `
        <div class="inactive-panel">
          <h2 style="margin:28px 0 14px;font-size:18px;font-weight:700;text-align:center;color:#334155">
            מספרי כתף שאינם פעילים
          </h2>
          <div class="inactive-grid">
            ${inactive.map(r => `
              <div class="inactive-chip">
                <strong>#${r.shoulderNumber}</strong>
                <span class="status">${r.status === 'temp_removed' ? 'גריעה זמנית' : 'פרש'}</span>
              </div>`).join('')}
          </div>
        </div>` : ''}

      <div class="export-hint">עדכון ציון: לחיצה על המספר ושחרור (יציאה מהשדה) שומר. עריכת הערה: לחיצה על כפתור ההערה.</div>
    `;

    // --- חיבור מאזינים מקומיים (לא לכפתורי ייצוא) ---
    contentDiv.querySelectorAll('[data-comment-btn]').forEach(btn => {
      btn.addEventListener('click', () => openCommentModal(btn.getAttribute('data-comment-btn')));
    });

    contentDiv.querySelectorAll('.score-input').forEach(inp => {
      inp.dataset.prev = inp.value;
      inp.addEventListener('focus', () => {
        setTimeout(() => {
          try { inp.select(); } catch(_){}
        }, 0);
      });
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          inp.blur();
        }
      });
      inp.addEventListener('blur', () => commitScore(inp));
    });

    function commitScore(inputEl) {
      let v = parseInt(inputEl.value, 10);
      if (isNaN(v)) v = parseInt(inputEl.dataset.prev, 10) || 1;
      v = Math.min(7, Math.max(1, v));
      if (v !== parseInt(inputEl.dataset.prev, 10)) {
        const shoulder = inputEl.dataset.shoulder;
        const type = inputEl.dataset.type;
        state.manualScores[shoulder] = state.manualScores[shoulder] || { sprint:1, crawl:1, stretcher:1 };
        state.manualScores[shoulder][type] = v;
        saveState();
        inputEl.dataset.prev = v;
        window.Pages.renderReportPage();
        return;
      }
      inputEl.value = v;
    }
  };

  /**
   * מטפל בלחיצה על כפתור העלאה ל-Drive
   */
  async function handleDriveUploadClick(btn) {
    btn.disabled = true;
    const show = (typeof window.showLoading === 'function') ? window.showLoading : (m)=>console.log('[loading]', m);
    const hide = (typeof window.hideLoading === 'function') ? window.hideLoading : ()=>{};
    show('יוצר דוח ושולח ל-Drive...');
    try {
      const blob = await window.ReportGenerator.generateFinalReportBlob();
      const fileName = buildReportFileName();
      const res = await window.GoogleDriveUploader.upload(blob, { fileName });
      alert(res.status === 'success' ? 'הקובץ נשלח בהצלחה!' : 'שגיאה בהעלאה: ' + res.message);
    } catch (err) {
      console.error("Upload process failed:", err);
      alert('כשל בתהליך ההעלאה: ' + err.message);
    } finally {
      hide();
      btn.disabled = false;
    }
  }

  /**
   * מטפל בלחיצה על כפתור הורדה מקומית
   */
  async function handleExcelDownloadClick(btn) {
    btn.disabled = true;
    const show = (typeof window.showLoading === 'function') ? window.showLoading : (m)=>console.log('[loading]', m);
    const hide = (typeof window.hideLoading === 'function') ? window.hideLoading : ()=>{};
    show('יוצר קובץ אקסל...');
    try {
      const blob = await window.ReportGenerator.generateFinalReportBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = buildReportFileName();
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Local download failed:", err);
      alert('כשל בהורדת הקובץ: ' + err.message);
    } finally {
      hide();
      btn.disabled = false;
    }
  }

  /**
   * מאזין אירועים מרכזי. הופך להיות פונקציה ציבורית.
   */
  window.Pages.initReportPageListeners = function initReportPageListeners() {
    const contentDiv = document.getElementById('content');
    if (!contentDiv || contentDiv.dataset.reportListenersAttached) {
      return; // מונע חיבור כפול
    }
    contentDiv.dataset.reportListenersAttached = 'true';

    contentDiv.addEventListener('click', async (e) => {
      const uploadBtn = e.target.closest('#upload-drive-btn');
      const exportBtn = e.target.closest('#export-excel-btn');
      // ... לוגיקה נוספת לטיפול בכפתורים אחרים ...

      if (uploadBtn) {
        await handleDriveUploadClick(uploadBtn);
      } else if (exportBtn) {
        await handleExcelDownloadClick(exportBtn);
      }
    });

    // ... (שאר המאזינים לעריכת ציונים) ...
  };

})(); // סוף ה-IIFE
