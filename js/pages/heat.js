(function () {
    window.Pages = window.Pages || {};
    window.Pages.renderHeatPage = function renderHeatPage(heatIndex) {
        const contentDiv = document.getElementById('content');
        const headerTitle = document.getElementById('header-title');
        const heat = state.heats[heatIndex];

        headerTitle.textContent = `מקצה ספרינט ${heat?.heatNumber || heatIndex + 1}`;

        if (!document.getElementById('sprint-heat-style')) {
            const style = document.createElement('style');
            style.id = 'sprint-heat-style';
            style.textContent = `
        .heat-header { 
          display: grid; 
          grid-template-columns: auto 1fr auto; 
          align-items: center; 
          gap: 8px; 
          margin: 6px 0 4px; 
          direction: rtl;
        }
        .heat-title {
          font-weight: 800;
          letter-spacing: .2px;
          font-size: clamp(22px, 6vw, 32px);
          color: inherit;
          text-align: center;
        }
        .timer-display { font-variant-numeric: tabular-nums; letter-spacing: 0.5px; }
        .timer-display.small { font-size: clamp(18px, 5vw, 26px); line-height: 1.1; }
        .heat-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 8px 0 12px; }
        .heat-btn { height: 44px; border-radius: 10px; font-weight: 700; border: none; }
        .heat-btn.start { grid-column: span 2; background: #10b981; color: #fff; }
        .heat-btn.start:hover { background:#059669; }
        .heat-btn.stop { background:#ef4444; color:#fff; }
        .heat-btn.stop:hover { background:#dc2626; }
        .heat-btn.undo { background:#f59e0b; color:#fff; }
        .heat-btn.undo:hover { background:#d97706; }
        .next-inline-btn, .prev-inline-btn {
          display:inline-flex; 
          align-items:center; 
          gap:6px;
          padding: 8px 12px; 
          border-radius: 10px; 
          font-weight:700;
          background:#3b82f6; 
          color:#fff; 
          border:none;
        }
        .next-inline-btn:hover, .prev-inline-btn:hover { background:#2563eb; }
        .next-inline-btn[disabled], .prev-inline-btn[disabled] { 
          opacity:.6; 
          cursor:not-allowed; 
        }
        .arrival-header { padding: 4px 6px; color: #6b7280; }
        .gc-input {
          width: 100%;
          height: 34px;
          line-height: 34px;
          font-size: 13px;
          padding: 0 8px;
          text-align: right;
          border: 1px solid rgba(0,0,0,.15);
          border-radius: 8px;
          background: #fff;
          color: #111827;
        }
        .dark .gc-input {
          background: rgba(255,255,255,.06);
          color: inherit;
          border-color: rgba(255,255,255,.18);
        }`;
            document.head.appendChild(style);
        }

        if (!document.getElementById('inline-nav-style')) {
            const style = document.createElement('style');
            style.id = 'inline-nav-style';
            style.textContent = `
      .heat-header{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;margin:6px 0 4px;direction:rtl}
      .heat-title{font-weight:800;letter-spacing:.2px;font-size:clamp(22px,6vw,32px);text-align:center}
      .next-inline-btn,.prev-inline-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:10px;font-weight:700;background:#3b82f6;color:#fff;border:none}
      .next-inline-btn:hover,.prev-inline-btn:hover{background:#2563eb}
      .next-inline-btn[disabled],.prev-inline-btn[disabled]{opacity:.6;cursor:not-allowed}
    `;
            document.head.appendChild(style);
        }

        const activeRunners = state.runners
            .filter(runner =>
                runner.shoulderNumber &&
                !heat.arrivals.some(a => a.shoulderNumber === runner.shoulderNumber) &&
                !state.crawlingDrills.runnerStatuses[runner.shoulderNumber]
            )
            .sort((a, b) => a.shoulderNumber - b.shoulderNumber);

        const headerNav = `
        <div class="heat-header">
            <button id="prev-heat-btn-inline" class="prev-inline-btn" ${heatIndex === 0 ? 'disabled' : ''}>
                <span class="text-xl">→</span> קודם
            </button>
            <div class="heat-title">מקצה ספרינט ${heatIndex + 1}/${CONFIG.NUM_HEATS}</div>
            <button id="next-heat-btn-inline" class="next-inline-btn">
                ${heatIndex < CONFIG.NUM_HEATS - 1 ? 'הבא' : 'למסך זחילות'} <span class="text-xl">←</span>
            </button>
        </div>`;

        const bodyHtml = `
        ${headerNav}
        <div id="timer-display" class="timer-display small text-center my-2" aria-live="polite">00:00:000</div>

        <div class="heat-actions">
            <button id="start-btn" class="heat-btn start ${heat.started ? 'hidden' : ''}">התחל</button>
            <button id="stop-btn" class="heat-btn stop ${!heat.started || heat.finished ? 'hidden' : ''}">סיים</button>
            <button id="undo-btn" class="heat-btn undo ${!heat.started || heat.finished || heat.arrivals.length === 0 ? 'hidden' : ''}">בטל הגעה אחרונה</button>
        </div>

        <div id="runner-buttons-container" class="my-4 ${!heat.started || heat.finished ? 'hidden' : ''}">
            <h3 class="text-base md:text-lg font-semibold mb-2 text-center text-gray-500">לחץ על מספר הכתף של הרץ שהגיע</h3>
            <div class="auto-grid">
                ${activeRunners.map(runner => `
                    <button class="runner-btn bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-md text-xl md:text-2xl"
                            data-shoulder-number="${runner.shoulderNumber}">
                        ${runner.shoulderNumber}
                    </button>`).join('')}
            </div>
        </div>

        ${heat.arrivals.length > 0 ? `
            <div class="arrival-header">
                <div class="flex items-center gap-2">
                    <span class="font-semibold text-xs md:text-sm whitespace-nowrap" style="min-width:88px;text-align:right;">מספר כתף</span>
                    <span class="flex-1 text-center font-semibold text-xs md:text-sm">הערות כלליות</span>
                    <span class="font-semibold text-xs md:text-sm whitespace-nowrap" style="min-width:88px;text-align:left;">זמן ריצה</span>
                </div>
            </div>` : ''}
    
            <div id="arrival-list" class="space-y-2">
                ${heat.arrivals.map((arrival, index) => {
            const sn = arrival.shoulderNumber;
            const gc = (state.generalComments && state.generalComments[sn]) ? state.generalComments[sn] : '';
            const timeText = arrival.finishTime ? formatTime(arrival.finishTime) : (arrival.comment || '');
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

        contentDiv.innerHTML = bodyHtml;

        contentDiv.querySelectorAll('#heat-bottom-nav, .heat-bottom-nav, .sticky-bottom')?.forEach(el => el.remove());
        ['prev-heat-btn', 'next-heat-btn'].forEach(id => document.getElementById(id)?.remove());

        if (heat.started && !heat.finished) startTimer();
        else updateTimerDisplay(heat.arrivals.length > 0 ? heat.arrivals[heat.arrivals.length - 1].finishTime : 0);

        document.getElementById('start-btn')?.addEventListener('click', () => handleStart(heat));
        document.getElementById('stop-btn')?.addEventListener('click', () => confirmStopAndAdvance(heat, 'sprint'));
        document.getElementById('undo-btn')?.addEventListener('click', () => handleUndoArrival(heat));
        document.getElementById('runner-buttons-container')?.addEventListener('click', (e) => handleAddRunnerToHeat(e, heat, state.currentHeatIndex));

        contentDiv.querySelectorAll('.gc-input').forEach(inp => {
            inp.addEventListener('input', (e) => {
                const sn = e.currentTarget.dataset.shoulderNumber;
                state.generalComments[sn] = e.currentTarget.value;
                saveState();
            });
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
    };
})();