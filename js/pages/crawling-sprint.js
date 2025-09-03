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
                /* grid: min 3 per row; grow on larger screens */
                .cs-grid-3min{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
                @media (min-width:640px){.cs-grid-3min{grid-template-columns:repeat(5,minmax(0,1fr))}}
                .arrival-header{padding:4px 6px;color:#6b7280}
                .gc-input{width:100%;height:34px;line-height:34px;font-size:13px;padding:0 8px;text-align:right;border:1px solid rgba(0,0,0,.15);border-radius:8px;background:#fff;color:#111827}
                .dark .gc-input{background:rgba(255,255,255,.06);color:inherit;border-color:rgba(255,255,255,.18)}
            `;
            document.head.appendChild(s2);
        }

        const activeRunners = state.runners
            .filter(r => r.shoulderNumber
                && !state.crawlingDrills.runnerStatuses[r.shoulderNumber]
                && !sprint.arrivals.some(a => a.shoulderNumber === r.shoulderNumber))
            .sort((a, b) => a.shoulderNumber - b.shoulderNumber);

        const headerNav = `
            <div class="heat-header">
                <button id="prev-crawling-sprint-btn-inline" class="prev-inline-btn" ${sprintIndex === 0 ? 'disabled' : ''}>
                    <span class="text-xl">→</span> קודם
                </button>
                <div class="heat-title">מקצה זחילה ${sprintIndex + 1}/${CONFIG.MAX_CRAWLING_SPRINTS}</div>
                <button id="next-crawling-sprint-btn-inline" class="next-inline-btn">
                    ${sprintIndex < CONFIG.MAX_CRAWLING_SPRINTS - 1 ? 'הבא' : CONFIG.STRETCHER_PAGE_LABEL} <span class="text-xl">←</span>
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
            <div id="timer-display" class="text-4xl md:text-6xl font-mono my-4 text-center timer-display" aria-live="polite">00:00</div>

            <div class="flex justify-center gap-2 my-3 flex-wrap">
                <button id="start-btn" class="bg-green-500 hover:bg-green-600 text-white text-base md:text-xl font-bold py-2 px-4 rounded-lg ${sprint.started ? 'hidden' : ''}">התחל</button>
                <button id="stop-btn" class="bg-red-500 hover:bg-red-600 text-white text-base md:text-xl font-bold py-2 px-4 rounded-lg ${!sprint.started || sprint.finished ? 'hidden' : ''}">סיים</button>
                <button id="undo-btn" class="bg-yellow-500 hover:bg-yellow-600 text-white text-base md:text-xl font-bold py-2 px-4 rounded-lg ${!sprint.started || sprint.finished || sprint.arrivals.length === 0 ? 'hidden' : ''}">בטל הגעה אחרונה</button>
            </div>

            <div id="runner-buttons-container" class="my-5 ${!sprint.started || sprint.finished ? 'hidden' : ''}">
                <h3 class="text-base md:text-xl font-semibold mb-2 text-center">לחץ על מספר הכתף של הרץ שהגיע</h3>
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