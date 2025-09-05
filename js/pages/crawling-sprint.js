(function () {
    window.Pages = window.Pages || {};

    window.Pages.renderCrawlingSprintPage = function renderCrawlingSprintPage(sprintIndex) {
        const contentDiv = document.getElementById('content');
        const headerTitle = document.getElementById('header-title');
        const sprint = state.crawlingDrills.sprints[sprintIndex];

        headerTitle.textContent = `מקצה זחילה ${sprint?.heatNumber || sprintIndex + 1}`;

        // Header styles (once)
        if (!document.getElementById('inline-nav-style')) {
            const style = document.createElement('style');
            style.id = 'inline-nav-style';
            style.textContent = `
                .heat-header{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;margin:6px 0 4px;direction:rtl}
                .next-inline-btn,.prev-inline-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:10px;font-weight:700;background:#3b82f6;color:#fff;border:none}
                .next-inline-btn:hover,.prev-inline-btn:hover{background:#2563eb}
                .next-inline-btn[disabled],.prev-inline-btn[disabled]{opacity:.6;cursor:not-allowed}
            `;
            document.head.appendChild(style);
        }
        // Crawling sprint page styles (once)
        if (!document.getElementById('crawling-sprint-style')) {
            const s2 = document.createElement('style');
            s2.id = 'crawling-sprint-style';
            s2.textContent = `
                .cs-grid-3min{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
                @media (min-width:640px){.cs-grid-3min{grid-template-columns:repeat(5,minmax(0,1fr))}}
                .arrival-header{padding:4px 6px;color:#6b7280}
                .gc-input{width:100%;height:34px;line-height:34px;font-size:13px;padding:0 8px;text-align:right;border:1px solid rgba(0,0,0,.15);border-radius:8px;background:#fff;color:#111827}
                .dark .gc-input{background:rgba(255,255,255,.06);color:inherit;border-color:rgba(255,255,255,.18)}
            `;
            document.head.appendChild(s2);
        }

        // Shared heat bar style (match sprints)
        if (!document.getElementById('heat-bar-style')) {
            const st = document.createElement('style');
            st.id = 'heat-bar-style';
            st.textContent = `
              .heat-bar{direction:rtl;display:flex;align-items:center;justify-content:space-between;
                gap:12px;background:#1e3a8a;color:#fff;padding:10px 16px;border-radius:16px;
                margin:12px 0 14px;}
              .dark .heat-bar{background:#334155}
              .heat-bar-btn{background:#2563eb;color:#fff;border:none;font-weight:600;
                padding:8px 14px;border-radius:10px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-size:14px}
              .heat-bar-btn[disabled]{opacity:.55;cursor:not-allowed}
              .heat-bar-btn:hover:not([disabled]){background:#1d4ed8}
              .heat-bar-center{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px}
              .heat-bar-title{font-size:16px;font-weight:700;letter-spacing:.5px}
              .heat-timer-box{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center}
              .heat-timer-box .icon-clock{font-size:22px}
              #timer-display{font-family:monospace;font-size:22px;min-width:92px;text-align:center}
              .timer-btn-sm{background:#16a34a;color:#fff;border:none;padding:6px 14px;border-radius:10px;
                font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;
                box-shadow:0 2px 6px rgba(0,0,0,.18);transition:.18s;font-size:14px}
              .timer-btn-sm#stop-btn{background:#dc2626}
              .timer-btn-sm#undo-btn{background:#fde047;color:#1e293b}
              .timer-btn-sm.hidden{display:none!important}
              .timer-btn-sm:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,.28)}
              .dark .timer-btn-sm{background:#0f172a;color:#fff}
              .dark .timer-btn-sm#stop-btn{background:#b91c1c}
              .dark .timer-btn-sm#undo-btn{background:#eab308;color:#1e293b}
              .dark .timer-btn-sm#start-btn{background:#15803d}
            `;
            document.head.appendChild(st);
        }

        const activeRunners = state.runners
            .filter(r => r.shoulderNumber
                && !state.crawlingDrills.runnerStatuses[r.shoulderNumber]
                && !sprint.arrivals.some(a => a.shoulderNumber === r.shoulderNumber))
            .sort((a, b) => a.shoulderNumber - b.shoulderNumber);

        const headerNav = `
          <div class="heat-bar">
            <button id="prev-crawling-sprint-btn-inline" class="heat-bar-btn" ${sprintIndex === 0 ? 'disabled' : ''}>← קודם</button>
            <div class="heat-bar-center">
              <div class="heat-bar-title">מקצה זחילה ${sprintIndex + 1}/${CONFIG.MAX_CRAWLING_SPRINTS}</div>
              <div class="heat-timer-box">
                <span class="icon-clock">🕒</span>
                <span id="timer-display" class="timer-display" aria-live="polite">00:00</span>
                <button id="start-btn" class="timer-btn-sm ${sprint.started ? 'hidden' : ''}">התחל</button>
                <button id="stop-btn" class="timer-btn-sm ${!sprint.started || sprint.finished ? 'hidden' : ''}">סיים</button>
                <button id="undo-btn" class="timer-btn-sm ${!sprint.started || sprint.finished || sprint.arrivals.length === 0 ? 'hidden' : ''}" title="בטל הגעה אחרונה">↶ בטל</button>
              </div>
            </div>
            <button id="next-crawling-sprint-btn-inline" class="heat-bar-btn">
              ${sprintIndex < CONFIG.MAX_CRAWLING_SPRINTS - 1 ? 'הבא' : CONFIG.STRETCHER_PAGE_LABEL} →
            </button>
          </div>
        `;

        // Arrivals header (like sprints)
        const arrivalsHeaderHtml = sprint.arrivals.length > 0 ? `
            <div class="arrival-header">
                <div class="flex items-center gap-2">
                    <span class="font-semibold text-xs md:text-sm whitespace-nowrap" style="min-width:88px;text-align:right;">מספר כתף</span>
                    <span class="flex-1 text-center font-semibold text-xs md:text-sm">הערות כלליות</span>
                    <span class="font-semibold text-xs md:text-sm whitespace-nowrap" style="min-width:88px;text-align:left;">זמן</span>
                </div>
            </div>` : '';

        // Arrivals list with general-comments input
        const arrivalsListHtml = `
            <div id="arrival-list" class="space-y-2">
                ${sprint.arrivals.map((arrival, index) => {
                    const sn = arrival.shoulderNumber;
                    const gc = (state.generalComments && state.generalComments[sn]) ? state.generalComments[sn] : '';
                    const timeText = arrival.finishTime != null
                        ? formatTime_no_ms(arrival.finishTime)
                        : (arrival.comment || '');
                    return `
                        <div class="bg-white p-3 rounded-lg shadow-sm flex items-center gap-2">
                            <span class="font-bold text-gray-700 text-sm md:text-base whitespace-nowrap" style="min-width:88px;text-align:right;">${index + 1}. ${sn}</span>
                            <span class="flex-1">
                                <input class="gc-input" type="text" data-shoulder-number="${sn}" value="${(gc || '').replace(/"/g, '&quot;')}" placeholder="הערה כללית...">
                            </span>
                            <span class="font-mono text-gray-600 text-sm md:text-base whitespace-nowrap" style="min-width:88px;text-align:left;">${timeText}</span>
                        </div>`;
                }).join('')}
            </div>
        `;

        contentDiv.innerHTML = `
          ${headerNav}
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
          ${arrivalsHeaderHtml}
          ${arrivalsListHtml}
        `;

        // Timer
        if (sprint.started && !sprint.finished) startTimer();
        else updateTimerDisplay(sprint.arrivals.length > 0 ? sprint.arrivals[sprint.arrivals.length - 1].finishTime : 0, false);

        // Listeners
        document.getElementById('start-btn')?.addEventListener('click', () => handleStart(sprint));
        document.getElementById('stop-btn')?.addEventListener('click', () => confirmStopAndAdvance(sprint, 'crawling'));
        document.getElementById('undo-btn')?.addEventListener('click', () => handleUndoArrival(sprint));
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

        // General comments live update
        contentDiv.querySelectorAll('.gc-input').forEach(inp => {
            inp.addEventListener('input', (e) => {
                const sn = parseInt(e.target.dataset.shoulderNumber, 10);
                const v = e.target.value || '';
                state.generalComments = state.generalComments || {};
                if (v.trim().length === 0) delete state.generalComments[sn];
                else state.generalComments[sn] = v;
                saveState();
            });
        });
    };
})();