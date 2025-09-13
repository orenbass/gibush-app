(function () {
    window.Pages = window.Pages || {};

    // ADDED: רענון עמוד מקצה ספרינט כשיש שינוי ברצים (עריכה / מחיקה)
    if (!window.__heatRunnerEventsBound) {
        window.__heatRunnerEventsBound = true;
        ['runnersChanged', 'activeRunnersChanged'].forEach(evt => {
            window.addEventListener(evt, () => {
                try {
                    if (state.currentPage === PAGES.HEATS && typeof state.currentHeatIndex === 'number') {
                        // רינדור מחדש לעדכון כפתורי הרצים (הכפתור הכחול נעלם למי שנמחק)
                        window.Pages.renderHeatPage(state.currentHeatIndex);
                    }
                } catch (e) { /* silent */ }
            });
        });
    }

    function ensureCommentsModalLoaded() {
        return new Promise((resolve, reject) => {
            if (window.CommentsModal?.open) return resolve();
            if (document.querySelector('script[data-comments-modal]')) {
                const chk = () => window.CommentsModal?.open ? resolve() : setTimeout(chk, 40);
                return chk();
            }
            const s = document.createElement('script');
            s.src = 'js/components/commentsModal.js';
            s.async = true;
            s.dataset.commentsModal = 'true';
            s.onload = () => window.CommentsModal?.open ? resolve() : reject(new Error('CommentsModal missing'));
            s.onerror = () => reject(new Error('Failed loading commentsModal.js'));
            document.head.appendChild(s);
        });
    }

    function ensureArrivalRowsLoaded(){
        return new Promise((resolve,reject)=>{
            if (window.ArrivalRows?.render) return resolve();
            const existing = document.querySelector('script[data-arrival-rows]');
            if (existing){
                const chk = () => window.ArrivalRows?.render ? resolve() : setTimeout(chk,40);
                return chk();
            }
            const s = document.createElement('script');
            s.src = 'js/components/arrivalRows.js';
            s.async = true;
            s.dataset.arrivalRows = 'true';
            s.onload = () => window.ArrivalRows?.render ? resolve() : reject(new Error('arrivalRows API missing'));
            s.onerror = () => reject(new Error('Failed loading arrivalRows.js'));
            document.head.appendChild(s);
        });
    }

    function ensureSharedStylesLoaded(){
        return new Promise((resolve,reject)=>{
            if (window.ensureSharedCompetitionStyles){
                window.ensureSharedCompetitionStyles();
                return resolve();
            }
            const existing = document.querySelector('script[data-shared-styles]');
            if (existing){
                const chk = () => {
                    if (window.ensureSharedCompetitionStyles){
                        window.ensureSharedCompetitionStyles();
                        resolve();
                    } else setTimeout(chk,40);
                };
                return chk();
            }
            const s = document.createElement('script');
            s.src = 'js/components/sharedStyles.js';
            s.async = true;
            s.dataset.sharedStyles = 'true';
            s.onload = () => {
                if (window.ensureSharedCompetitionStyles){
                    window.ensureSharedCompetitionStyles();
                    resolve();
                } else reject(new Error('sharedStyles.js loaded but function missing'));
            };
            s.onerror = () => reject(new Error('Failed loading sharedStyles.js'));
            document.head.appendChild(s);
        });
    }

    function buildCommentButton(shoulderNumber) {
        const raw = state.generalComments?.[shoulderNumber];
        const arr = Array.isArray(raw)
            ? raw.filter(c => c && c.trim())
            : (raw && String(raw).trim() ? [String(raw).trim()] : []);
        const count = arr.length;
        const level = Math.min(count, 5);
        let summary = 'כתוב הערה...';
        if (count) {
            const joined = arr.join(' | ').replace(/\s+/g,' ');
            summary = joined.length > 24 ? joined.slice(0,24) + '…' : joined;
        }
        return `
        <button type="button"
            class="comment-btn comment-level-${level} ${count ? '' : 'comment-btn-empty'}"
            data-comment-btn="${shoulderNumber}"
            data-comment-count="${count}"
            title="הערות (${count})">
            ${summary} ✎
        </button>`;
    }

    function getCommentMeta(sn){
        const raw = state.generalComments?.[sn];
        const arr = Array.isArray(raw)
            ? raw.filter(c=>c && c.trim())
            : (raw && String(raw).trim() ? [String(raw).trim()] : []);
        const count = arr.length;
        const level = Math.min(count,5);
        let summary = 'כתוב הערה...';
        if (count){
            const joined = arr.join(' | ').replace(/\s+/g,' ');
            summary = joined.length > 24 ? joined.slice(0,24)+'…' : joined;
        }
        return { summary, count, level, empty: count===0 };
    }

    function refreshSingleCommentButton(btn){
        const sn = btn.getAttribute('data-comment-btn');
        if (!sn) return;
        const { summary, count, level, empty } = getCommentMeta(sn);
        for (let i=0;i<=5;i++) btn.classList.remove(`comment-level-${i}`);
        btn.classList.add(`comment-level-${level}`);
        btn.classList.toggle('comment-btn-empty', empty);
        btn.dataset.commentCount = count;
        btn.title = `הערות (${count})`;
        const desired = `${summary} ✎`;
        if (btn.innerHTML !== desired) btn.innerHTML = desired;
    }

    function refreshAllHeatCommentButtons(root=document){
        root.querySelectorAll('button.comment-btn[data-comment-btn]').forEach(refreshSingleCommentButton);
    }

    window.CommentButtonUpdater = window.CommentButtonUpdater || {};
    window.CommentButtonUpdater.update = function(sn){
        const btn = document.querySelector(`button.comment-btn[data-comment-btn="${sn}"]`);
        if (btn) refreshSingleCommentButton(btn);
    };

    window.Pages.renderHeatPage = async function renderHeatPage(heatIndex) {
        await ensureArrivalRowsLoaded();
        await ensureSharedStylesLoaded();

        const contentDiv = document.getElementById('content');
        const headerTitle = document.getElementById('header-title');
        const heat = state.heats[heatIndex];

        headerTitle.textContent = `מקצה ספרינט ${heat?.heatNumber || heatIndex + 1}`;

        function formatNoMs(totalMs){
            const totalSec = Math.floor(totalMs / 1000);
            const m = String(Math.floor(totalSec / 60)).padStart(2,'0');
            const s = String(totalSec % 60).padStart(2,'0');
            return `${m}:${s}`;
        }

        // NEW: ודא חישוב רשימת פעילים מעודכנת לפני שימוש
        if (typeof window.updateActiveRunners === 'function') {
            try { window.updateActiveRunners(); } catch(e) { /* silent */ }
        }

        function getActiveRunners() {
            const activeSet = new Set((state.activeShoulders || []).map(sn => String(sn).trim()));
            const seen = new Set();
            return (state.runners || [])
                .filter(r => {
                    if (!r) return false;
                    const sn = String(r.shoulderNumber || '').trim();
                    if (!sn) return false;
                    // אם קיימת רשימת activeShoulders השתמש בה כסינון קשיח
                    if (activeSet.size && !activeSet.has(sn)) return false;
                    if (state.crawlingDrills?.runnerStatuses?.[sn]) return false;
                    if (heat.arrivals.some(a => String(a.shoulderNumber) === sn)) return false;
                    if (seen.has(sn)) return false;
                    seen.add(sn);
                    return true;
                })
                .sort((a, b) => Number(a.shoulderNumber) - Number(b.shoulderNumber));
        }

        const activeRunners = getActiveRunners();

        const headerNav = `
          <div class="heat-bar">
            <div class="heat-bar-row top">
              <button id="prev-heat-btn-inline" class="heat-bar-btn" ${heatIndex === 0 ? 'disabled' : ''}>קודם</button>
              <div class="heat-bar-title">מקצה ${heatIndex + 1}/${CONFIG.NUM_HEATS}</div>
              <button id="next-heat-btn-inline" class="heat-bar-btn">
                ${heatIndex < CONFIG.NUM_HEATS - 1 ? 'הבא' : 'למסך זחילות'}
              </button>
            </div>
          </div>
        `;

        const arrivalsBlockHtml = ArrivalRows.render({
          arrivals: heat.arrivals,
          getCommentButtonHtml: buildCommentButton,
          formatTime: formatNoMs,
          showHeader: true,
          labels: { shoulder:'מספר כתף', comment:'הערות', time:'זמן ריצה' },
          listId: 'arrival-list'
        });

        const bodyHtml = `
          ${headerNav}
          <div class="timer-center">
            <span id="timer-display" class="timer-display small" aria-live="polite">00:00</span>
          </div>
          <div class="heat-actions">
            <button id="start-btn" class="heat-btn start ${heat.started ? 'hidden' : ''}">התחל</button>
            <button id="stop-btn" class="heat-btn stop ${!heat.started || heat.finished ? 'hidden' : ''}">סיים</button>
            <button id="undo-btn" class="heat-btn undo ${!heat.started || heat.finished || heat.arrivals.length === 0 ? 'hidden' : ''}">בטל הגעה אחרונה</button>
          </div>
          <div id="runner-buttons-container" class="my-4 ${!heat.started || heat.finished ? 'hidden' : ''}">
            <h3 class="text-base md:text-lg font-semibold mb-2 text-center text-white">לחץ על מספר הכתף של הרץ שהגיע</h3>
            <div class="auto-grid">
              ${activeRunners.map(r=>`
                <button class="runner-btn bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-md text-xl md:text-2xl"
                        data-shoulder-number="${r.shoulderNumber}">
                  ${r.shoulderNumber}
                </button>`).join('')}
            </div>
          </div>
          ${arrivalsBlockHtml}
        `;
        contentDiv.innerHTML = bodyHtml;

        // --- AFTER INITIAL RENDER: ensure buttons reflect current state ---
        refreshAllHeatCommentButtons(contentDiv);

        // Monitor dynamic mutations (e.g., ArrivalRows re-renders rows) and re-apply
        const arrivalList = contentDiv.querySelector('#arrival-list');
        if (arrivalList){
            if (window._heatCommentObserver) window._heatCommentObserver.disconnect();
            window._heatCommentObserver = new MutationObserver(muts=>{
                let need = false;
                for (const m of muts){
                    if (m.type === 'childList' || m.type === 'subtree' || m.addedNodes.length){
                        need = true; break;
                    }
                }
                if (need) requestAnimationFrame(()=>refreshAllHeatCommentButtons(arrivalList));
            });
            window._heatCommentObserver.observe(arrivalList,{childList:true,subtree:true});
        }

        if (window.ensureTimerIcon) window.ensureTimerIcon();

        (function wrapHeatTimer(){
          if (window._timerWrappedNoMs) return;
          const original = window.updateTimerDisplay;
          function fmt(ms){
            const totalSec = Math.floor((ms||0)/1000);
            const m = String(Math.floor(totalSec/60)).padStart(2,'0');
            const s = String(totalSec%60).padStart(2,'0');
            return `${m}:${s}`;
          }
          window.updateTimerDisplay = function(ms){
            if (typeof original === 'function'){
              try { original(ms); } catch {}
            }
            const text = fmt(ms||0);
            if (window.setTimerValue) setTimerValue(text);
            else {
              const el = document.getElementById('timer-display');
              if (el){
                const span = el.querySelector('#timer-value');
                if (span) span.textContent = text; else el.textContent = text;
              }
            }
          };
          window._timerWrappedNoMs = true;
        })();

        function adjustHeatActions(){
          const wrap = contentDiv.querySelector('.heat-actions');
          if(!wrap) return;
          const visible = [...wrap.querySelectorAll('.heat-btn:not(.hidden)')];
          wrap.classList.remove('single','double');
          if (visible.length === 1) wrap.classList.add('single');
          else if (visible.length === 2) wrap.classList.add('double');
        }
        adjustHeatActions();

        contentDiv.querySelectorAll('#heat-bottom-nav, .heat-bottom-nav, .sticky-bottom')?.forEach(el => el.remove());
        ['prev-heat-btn', 'next-heat-btn'].forEach(id => document.getElementById(id)?.remove());

        if (heat.started && !heat.finished) startTimer();
        else updateTimerDisplay(heat.arrivals.length > 0 ? heat.arrivals[heat.arrivals.length - 1].finishTime : 0);
        

        document.getElementById('start-btn')?.addEventListener('click', () => {
          handleStart(heat);
          setTimeout(()=>{adjustHeatActions(); refreshAllHeatCommentButtons(contentDiv);},0);
        });
        document.getElementById('stop-btn')?.addEventListener('click', () => {
          confirmStopAndAdvance(heat,'sprint');
          setTimeout(()=>{adjustHeatActions(); refreshAllHeatCommentButtons(contentDiv);},0);
        });
        document.getElementById('undo-btn')?.addEventListener('click', () => {
          handleUndoArrival(heat);
          setTimeout(()=>refreshAllHeatCommentButtons(contentDiv),0);
        });

        document.getElementById('runner-buttons-container')?.addEventListener('click', (e) => {
            handleAddRunnerToHeat(e, heat, state.currentHeatIndex);
            
            // עדכון הרשימה של הכפתורים אחרי הוספת רץ
            setTimeout(() => {
                const container = document.getElementById('runner-buttons-container');
                if (container && !heat.finished) {
                    const updatedActiveRunners = getActiveRunners();
                    const grid = container.querySelector('.auto-grid');
                    if (grid) {
                        grid.innerHTML = updatedActiveRunners.map(r => `
                            <button class="runner-btn bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-md text-xl md:text-2xl"
                                    data-shoulder-number="${r.shoulderNumber}">
                              ${r.shoulderNumber}
                            </button>`).join('');
                    }
                }
                refreshAllHeatCommentButtons(contentDiv);
            }, 0);
        });

        document.getElementById('next-heat-btn-inline')?.addEventListener('click', () => {
            if (state.currentHeatIndex < CONFIG.NUM_HEATS - 1) {
                state.currentHeatIndex++;
                state.currentPage = PAGES.HEATS;
            } else {
                state.currentPage = PAGES.CRAWLING_COMMENTS;
            }
            saveState();
            render();
        });
        document.getElementById('prev-heat-btn-inline')?.addEventListener('click', () => {
            if (state.currentHeatIndex > 0) {
                state.currentHeatIndex--;
                saveState();
                render();
            }
        });

        // Attach modal handlers (ArrivalRows helper)
        ArrivalRows.attachCommentHandlers(contentDiv, {
            onOpen: async (sn, btn) => {
                try {
                    await ensureCommentsModalLoaded();
                    window.CommentsModal.open(sn, {
                        originBtn: btn,
                        onSave: (val) => {
                            state.generalComments = state.generalComments || {};
                            state.generalComments[sn] = val;
                            saveState();
                            window.CommentButtonUpdater && window.CommentButtonUpdater.update(sn);
                        }
                    });
                } catch (e) {
                    console.error(e);
                    alert('שגיאה בטעינת מודול ההערות');
                }
            }
        });
    };

    function normalizeCommentsForDisplay(raw){
      if (Array.isArray(raw)) {
        return raw.filter(c=>c && c.trim()).join(' | ');
      }
      return (raw || '');
    }
})();