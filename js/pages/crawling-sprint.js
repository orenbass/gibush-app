(function () {
    window.Pages = window.Pages || {};

    // הוספה: פונקציית טעינת מודול ההערות (אם לא נטען)
    function ensureCommentsModalLoaded() {
        return new Promise((resolve, reject) => {
            if (window.CommentsModal?.open) return resolve();
            if (document.querySelector('script[data-comments-modal]')) {
                const check = () => {
                    if (window.CommentsModal?.open) resolve();
                    else setTimeout(check, 40);
                };
                return check();
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
        return new Promise((resolve, reject)=>{
            if (window.ArrivalRows?.render) return resolve();
            // כבר נטען? ממתינים
            const existing = document.querySelector('script[data-arrival-rows]');
            if (existing){
                const chk = () => {
                    if (window.ArrivalRows?.render) resolve();
                    else setTimeout(chk,40);
                };
                return chk();
            }
            const s = document.createElement('script');
            s.src = 'js/components/arrivalRows.js';
            s.async = true;
            s.dataset.arrivalRows = 'true';
            s.onload = () => window.ArrivalRows?.render ? resolve() : reject(new Error('arrivalRows.js loaded but missing API'));
            s.onerror = () => reject(new Error('Failed loading arrivalRows.js'));
            document.head.appendChild(s);
        });
    }

    function ensureSharedStylesLoaded(){
        return new Promise((resolve,reject)=>{
            if (window.ensureSharedCompetitionStyles){
                window.ensureSharedCompetitionStyles(); return resolve();
            }
            const existing = document.querySelector('script[data-shared-styles]');
            if (existing){
                const chk=()=>{
                    if (window.ensureSharedCompetitionStyles){
                        window.ensureSharedCompetitionStyles(); resolve();
                    } else setTimeout(chk,40);
                }; return chk();
            }
            const s=document.createElement('script');
            s.src='js/components/sharedStyles.js';
            s.async=true;
            s.dataset.sharedStyles='true';
            s.onload=()=>{
                if (window.ensureSharedCompetitionStyles){
                    window.ensureSharedCompetitionStyles(); resolve();
                } else reject(new Error('sharedStyles missing'));
            };
            s.onerror=()=>reject(new Error('Failed loading sharedStyles.js'));
            document.head.appendChild(s);
        });
    }

    // הוספה: פונקציית קיצור טקסט להערות (תומך במערך / מחרוזת)
    function truncateCommentsSummary(raw, max = 20) {
        if (raw == null) return 'כתוב הערה...';
        let str;
        if (Array.isArray(raw)) {
            const cleaned = raw.filter(c => !!c && c.trim());
            if (!cleaned.length) return 'כתוב הערה...';
            str = cleaned.join(' | ');
        } else {
            str = String(raw || '').trim();
            if (!str) return 'כתוב הערה...';
        }
        const single = str.replace(/\s+/g, ' ');
        return single.length > max ? single.slice(0, max) + '…' : single;
    }

    // הוספה: מאזינים גלובליים לרענון העמוד כאשר רשימת הרצים משתנה (מחיקה/עריכה)
    if (!window.__crawlingSprintRunnerEventsBound) {
        window.__crawlingSprintRunnerEventsBound = true;
        ['runnersChanged', 'activeRunnersChanged'].forEach(evt => {
            window.addEventListener(evt, () => {
                try {
                    if (state.currentPage === PAGES.CRAWLING_SPRINT && state?.crawlingDrills?.currentSprintIndex != null) {
                        // רינדור מחדש כדי שכפתורי הרצים יתעדכנו (הכפתורים הכחולים ייעלמו למי שנמחק)
                        window.Pages.renderCrawlingSprintPage(state.crawlingDrills.currentSprintIndex);
                    }
                } catch (e) { /* silent */ }
            });
        });
    }

    window.Pages.renderCrawlingSprintPage = async function renderCrawlingSprintPage(sprintIndex) {
        await ensureSharedStylesLoaded();
        await ensureArrivalRowsLoaded(); // חשוב: לפני ArrivalRows.render
        const contentDiv = document.getElementById('content');
        const headerTitle = document.getElementById('header-title');
        const sprint = state.crawlingDrills.sprints[sprintIndex];

        // NEW: רענון רשימת פעילים לפני חישוב כפתורים
        if (typeof window.updateActiveRunners === 'function') { try { window.updateActiveRunners(); } catch(e) { /* silent */ } }

        // REPLACED: חישוב רצים פעילים עם נרמול + activeShoulders
        function getActiveRunners() {
            const activeSet = new Set((state.activeShoulders || []).map(sn => String(sn).trim()));
            const seen = new Set();
            return (state.runners || [])
                .filter(r => {
                    if (!r) return false;
                    const sn = String(r.shoulderNumber || '').trim();
                    if (!sn) return false;
                    if (activeSet.size && !activeSet.has(sn)) return false; // הסתמך על רשימת פעילים מחושבת
                    if (state.crawlingDrills?.runnerStatuses?.[sn]) return false; // פרש / מושעה זמנית
                    if (sprint.arrivals.some(a => String(a.shoulderNumber) === sn)) return false; // כבר הגיע
                    if (seen.has(sn)) return false; // כפול
                    seen.add(sn);
                    return true;
                })
                .sort((a,b) => Number(a.shoulderNumber) - Number(b.shoulderNumber));
        }

        const activeRunners = getActiveRunners();

        headerTitle.textContent = `מקצה זחילה ${sprint?.heatNumber || sprintIndex + 1}`;

        const headerNav = `
            <div class="heat-bar heat-bar-sprint">
                <div class="heat-bar-row top">
                    <button id="prev-crawling-sprint-btn-inline" class="heat-bar-btn" ${sprintIndex === 0 ? 'disabled' : ''}>קודם</button>
                    <div class="heat-bar-title">מקצה ${sprintIndex + 1}/${CONFIG.MAX_CRAWLING_SPRINTS}</div>
                    <button id="next-crawling-sprint-btn-inline" class="heat-bar-btn">
                        ${sprintIndex < CONFIG.MAX_CRAWLING_SPRINTS - 1 ? 'הבא' : CONFIG.STRETCHER_PAGE_LABEL}
                    </button>
                </div>
            </div>
        `;

        if (!window.ArrivalRows?.render){
            console.error('ArrivalRows not available');
            contentDiv.innerHTML = headerNav + '<div style="padding:12px;color:#f87171">שגיאה בטעינת קומפוננטת ההגעות</div>';
            return;
        }

        const arrivalsBlockHtml = ArrivalRows.render({
            arrivals: sprint.arrivals,
            getComment: sn => state.generalComments?.[sn],
            formatTime: formatTime_no_ms,
            truncate: truncateCommentsSummary,
            maxChars: 20,
            variant: 'float', // היה 'card' – עכשיו כמו בעמוד Heat (קו מפריד בלבד)
            showHeader: true,
            labels: { shoulder:'מספר כתף', comment:'הערות', time:'זמן זחילה' },
            listId: 'arrival-list'
        });

        contentDiv.innerHTML = `
            ${headerNav}
            <div class="timer-center">
              <span id="timer-display" class="timer-display small" aria-live="polite">00:00</span>
            </div>
            <div class="heat-actions">
                <button id="start-btn" class="heat-btn start ${sprint.started ? 'hidden' : ''}">התחל</button>
                <button id="stop-btn" class="heat-btn stop ${!sprint.started || sprint.finished ? 'hidden' : ''}">סיים</button>
                <button id="undo-btn" class="heat-btn undo ${!sprint.started || sprint.finished || sprint.arrivals.length === 0 ? 'hidden' : ''}">בטל הגעה אחרונה</button>
            </div>

            <div id="runner-buttons-container" class="my-4 ${!sprint.started || sprint.finished ? 'hidden' : ''}">
                <h3 class="text-base md:text-lg font-semibold mb-2 text-center">לחץ על מספר הכתף של הרץ שהגיע</h3>
                <div class="auto-grid">
                    ${activeRunners.map(r => `
                        <button class="runner-btn bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-md text-xl md:text-2xl" data-shoulder-number="${r.shoulderNumber}">${r.shoulderNumber}</button>`).join('')}
                </div>
            </div>

            ${arrivalsBlockHtml}
        `;

        // --- ADDED: Comment buttons state helpers (דומה לעמוד heat) ---
        function getCommentMeta(sn){
            const raw = state.generalComments?.[sn];
            const arr = Array.isArray(raw)
                ? raw.filter(c=>c && c.trim())
                : (raw && String(raw).trim() ? [String(raw).trim()] : []);
            const count = arr.length;
            const level = Math.min(count,5); // גם 0 יקבל level-0 (אדום)
            let summary = 'כתוב הערה...';
            if (count){
                const joined = arr.join(' | ').replace(/\s+/g,' ');
                summary = joined.length > 20 ? joined.slice(0,20)+'…' : joined;
            }
            return {summary,count,level,empty:count===0};
        }
        function refreshSingleCommentButton(btn){
            const sn = btn.getAttribute('data-comment-btn');
            if (!sn) return;
            const {summary,count,level,empty} = getCommentMeta(sn);
            for (let i=0;i<=5;i++) btn.classList.remove(`comment-level-${i}`);
            btn.classList.add(`comment-level-${level}`);
            btn.classList.toggle('comment-btn-empty', empty);
            btn.dataset.commentCount = count;
            // עדכון טקסט רק אם צריךכפתורים
            const desired = `${summary} ✎`;
            if (btn.innerHTML !== desired) btn.innerHTML = desired;
        }
        function refreshAllCommentButtons(root=contentDiv){
            root.querySelectorAll('#arrival-list button[data-comment-btn]').forEach(refreshSingleCommentButton);
        }

        // חשיפה גלובלית אופציונלית
        window.CrawlingSprintCommentButtons = window.CrawlingSprintCommentButtons || {};
        window.CrawlingSprintCommentButtons.refresh = refreshAllCommentButtons;

        // רענון ראשוני
        refreshAllCommentButtons();

        // מעקב DOM למניעת "איפוס" אחרי הוספת שורה / שינוי
        const arrivalList = contentDiv.querySelector('#arrival-list');
        if (arrivalList){
            if (window._crawlingSprintCommentObserver) window._crawlingSprintCommentObserver.disconnect();
            window._crawlingSprintCommentObserver = new MutationObserver(muts=>{
                let need = false;
                for (const m of muts){
                    if (m.type === 'childList' && (m.addedNodes.length || m.removedNodes.length)){
                        need = true; break;
                    }
                }
                if (need) requestAnimationFrame(()=>refreshAllCommentButtons(arrivalList));
            });
            window._crawlingSprintCommentObserver.observe(arrivalList,{childList:true,subtree:true});
        }

        // החזרת האייקון (גודל נשלט ב-CSS)
        if (window.ensureTimerIcon) window.ensureTimerIcon();

        (function wrapTimer(){
          if (window._timerWrapped) return;
          const original = window.updateTimerDisplay;
          function formatNoMs(ms){
            const totalSec = Math.floor((ms||0)/1000);
            const m = String(Math.floor(totalSec/60)).padStart(2,'0');
            const s = String(totalSec%60).padStart(2,'0');
            return `${m}:${s}`;
          }
            window.updateTimerDisplay = function(ms){
              if (typeof original === 'function'){
                try { original(ms); } catch{}
              }
              if (window.setTimerValue) setTimerValue(formatNoMs(ms||0));
              else {
                const el = document.getElementById('timer-display');
                if (el){
                  const span = el.querySelector('#timer-value');
                  if (span) span.textContent = formatNoMs(ms||0);
                  else el.textContent = formatNoMs(ms||0);
                }
              }
            };
          window._timerWrapped = true;
        })();

        updateTimerDisplay(
          sprint.arrivals.length
            ? sprint.arrivals[sprint.arrivals.length - 1].finishTime
            : 0
        );

        function adjustActionButtons(){
            const container = contentDiv.querySelector('.heat-actions');
            if(!container) return;
            const visible = [...container.querySelectorAll('.heat-btn:not(.hidden)')];
            container.classList.remove('single','double');
            if (visible.length === 1) container.classList.add('single');
            else if (visible.length === 2) container.classList.add('double');
            visible.forEach(btn=>{
                if (container.classList.contains('single') || container.classList.contains('double')) {
                    btn.style.flex = '1 1 0';
                } else {
                    btn.style.flex = '0 0 auto';
                }
            });
        }

        adjustActionButtons();

        // Timer
        if (sprint.started && !sprint.finished) startTimer();
        else updateTimerDisplay(sprint.arrivals.length > 0 ? sprint.arrivals[sprint.arrivals.length - 1].finishTime : 0, false);

        // Listeners
        document.getElementById('start-btn')?.addEventListener('click', () => {
            handleStart(sprint);
            setTimeout(()=>{
                adjustActionButtons();
                refreshAllCommentButtons();
            },0);
        });
        document.getElementById('stop-btn')?.addEventListener('click', () => {
            confirmStopAndAdvance(sprint, 'crawling');
            setTimeout(()=>{
                adjustActionButtons();
                refreshAllCommentButtons();
            },0);
        });
        document.getElementById('undo-btn')?.addEventListener('click', () => {
            handleUndoArrival(sprint);
            setTimeout(()=>{
                adjustActionButtons();
                refreshAllCommentButtons();
            },0);
        });
        document.getElementById('runner-buttons-container')?.addEventListener('click', (e) => {
            handleAddRunnerToHeat(e, sprint, -1);
            // REBUILD buttons like heat page so arrived runner disappears immediately
            setTimeout(() => {
                if (!sprint.finished) {
                    const container = document.getElementById('runner-buttons-container');
                    if (container) {
                        const grid = container.querySelector('.auto-grid');
                        if (grid) {
                            const updated = getActiveRunners();
                            grid.innerHTML = updated.map(r => `
                                <button class="runner-btn bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-md text-xl md:text-2xl" data-shoulder-number="${r.shoulderNumber}">${r.shoulderNumber}</button>`).join('');
                        }
                    }
                }
                refreshAllCommentButtons();
            }, 0);
        });

        // Navigation
        document.getElementById('prev-crawling-sprint-btn-inline')?.addEventListener('click', () => {
            if (sprintIndex > 0) {
                state.crawlingDrills.currentSprintIndex = sprintIndex - 1;
                saveState(); render();
            }
        });
        document.getElementById('next-crawling-sprint-btn-inline')?.addEventListener('click', () => {
            if (sprintIndex < CONFIG.MAX_CRAWLING_SPRINTS - 1) {
                state.crawlingDrills.currentSprintIndex = sprintIndex + 1;
                state.currentPage = PAGES.CRAWLING_SPRINT;
            } else {
                state.currentPage = PAGES.STRETCHER_HEAT;
                state.sociometricStretcher.currentHeatIndex = 0;
            }
            saveState(); render();
        });

        ArrivalRows.attachCommentHandlers(contentDiv, {
            onOpen: async (sn, btn)=>{
                try {
                    await ensureCommentsModalLoaded();
                    window.CommentsModal.open(sn, {
                        originBtn: btn,
                        truncateFn: truncateCommentsSummary,
                        onSave: (val)=>{
                            state.generalComments = state.generalComments || {};
                            state.generalComments[sn] = val;
                            saveState();
                            refreshSingleCommentButton(btn); // במקום רק שינוי טקסט
                        }
                    });
                } catch(e){
                    console.error(e);
                }
            }
        });

        // עדכון אחרי פעולות שמשנות את הרשימה
        ['start-btn','stop-btn','undo-btn'].forEach(id=>{
            contentDiv.getElementById?.(id)?.addEventListener('click', ()=>{
                setTimeout(()=>refreshAllCommentButtons(),0);
            });
        });

        // fallback: אם המודול מפעיל אירוע מותאם אישית
        window.addEventListener('commentsModal:saved', e => {
            const sn = e.detail?.shoulderNumber;
            const value = e.detail?.value;
            if (!sn) return;
            if (value !== undefined){
                state.generalComments = state.generalComments || {};
                state.generalComments[sn] = value;
                saveState();
            }
            const btn = contentDiv.querySelector(`[data-comment-btn="${sn}"]`);
            if (btn){
                btn.innerHTML = `${truncateCommentsSummary(value)} ✎`;
            }
            refreshAllCommentButtons();
        });
    };
})();