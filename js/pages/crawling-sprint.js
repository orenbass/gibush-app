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

    window.Pages.renderCrawlingSprintPage = async function renderCrawlingSprintPage(sprintIndex) {
        await ensureSharedStylesLoaded();
        await ensureArrivalRowsLoaded(); // חשוב: לפני ArrivalRows.render
        const contentDiv = document.getElementById('content');
        const headerTitle = document.getElementById('header-title');
        const sprint = state.crawlingDrills.sprints[sprintIndex];

        headerTitle.textContent = `מקצה זחילה ${sprint?.heatNumber || sprintIndex + 1}`;

        const activeRunners = state.runners
            .filter(r => r.shoulderNumber
                && !state.crawlingDrills.runnerStatuses[r.shoulderNumber]
                && !sprint.arrivals.some(a => a.shoulderNumber === r.shoulderNumber))
            .sort((a, b) => a.shoulderNumber - b.shoulderNumber);

        // הזרקת סטייל כמו בעמוד heat (אם עדיין לא נטען שם)


        if (!document.getElementById('heat-actions-layout-style')) {
            const la = document.createElement('style');
            la.id = 'heat-actions-layout-style';
            la.textContent = `
              .heat-actions{
                display:flex;
                width:100%;
                direction:rtl;
                gap:10px;
                flex-wrap:nowrap;
              }
              .heat-actions .heat-btn{flex:0 0 auto;min-width:110px;text-align:center}
              .heat-actions.single .heat-btn:not(.hidden){
                flex:1 1 0;
                min-width:0;
              }
              .heat-actions.double .heat-btn:not(.hidden){
                flex:1 1 0;
                min-width:0;
              }
            `;
            document.head.appendChild(la);
        }

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
                <div class="cs-grid-3min">
                    ${activeRunners.map(r => `
                        <button class="runner-btn bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg text-xl"
                                data-shoulder-number="${r.shoulderNumber}">
                            ${r.shoulderNumber}
                        </button>`).join('')}
                </div>
            </div>

            ${arrivalsBlockHtml}
        `;

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
            setTimeout(adjustActionButtons,0);
        });
        document.getElementById('stop-btn')?.addEventListener('click', () => {
            confirmStopAndAdvance(sprint, 'crawling');
            setTimeout(adjustActionButtons,0);
        });
        document.getElementById('undo-btn')?.addEventListener('click', () => {
            handleUndoArrival(sprint);
            setTimeout(adjustActionButtons,0);
        });
        document.getElementById('runner-buttons-container')?.addEventListener('click', (e) => handleAddRunnerToHeat(e, sprint, -1));

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
                            btn.querySelector('.comment-text').textContent = truncateCommentsSummary(val);
                            btn.classList.toggle('comment-btn-empty', !val || !String(val).trim());
                        }
                    });
                } catch(e){
                    console.error(e);
                }
            }
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
        });
    };
})();