(function () {
    window.Pages = window.Pages || {};
    window.Pages.renderCrawlingDrillsCommentsPage = function renderCrawlingDrillsCommentsPage() {
        headerTitle.textContent = 'תרגילי זחילה - הערות כלליות';

        if (!document.getElementById('crawling-comments-style')) {
            const s = document.createElement('style');
            s.id = 'crawling-comments-style';
            s.textContent = `
                .cs-grid-3min{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
                @media (min-width:640px){.cs-grid-3min{grid-template-columns:repeat(5,minmax(0,1fr))}}
                .arrival-header{padding:4px 6px;color:#6b7280}
                .gc-input{
                  width:100%;height:34px;line-height:34px;font-size:13px;padding:0 8px;
                  text-align:right;border:1px solid rgba(0,0,0,.15);border-radius:8px;background:#fff;color:#111827
                }
                .dark .gc-input{background:rgba(255,255,255,.06);color:inherit;border-color:rgba(255,255,255,.18)}

                .runner-sack-btn{
                  display:inline-flex;
                  align-items:center;
                  justify-content:center;
                  flex-direction:column;
                  gap:4px;
                  width:100%;
                  min-height:72px;
                  padding:10px 8px;
                  background:#e5e7eb;
                  color:#111827;
                  border:1px solid rgba(0,0,0,.15);
                  border-radius:10px;
                  font-weight:700;
                  font-size:20px;
                  cursor:pointer;
                  transition:.15s background,.15s box-shadow,.15s transform;
                  box-shadow:0 1px 2px rgba(0,0,0,.15);
                  user-select:none;
                }
                .runner-sack-btn:hover{
                  background:#d9dbe0;
                }
                .runner-sack-btn:active{
                  transform:translateY(1px);
                  box-shadow:0 0 0 rgba(0,0,0,0.15);
                }

                /* טיימר קטן */
                .runner-sack-btn .mini-sack-time{
                  font-size:11px;
                  line-height:1;
                  font-family:monospace;
                  color:#374151;
                  opacity:.85;
                  margin-top:2px;
                }
                .runner-sack-btn:not(.selected) .mini-sack-time{
                  visibility:hidden;
                }
                .dark .runner-sack-btn{
                  background:#374151;
                  color:#f1f5f9;
                  border-color:rgba(255,255,255,.18);
                }
                .dark .runner-sack-btn:hover{
                  background:#425065;
                }
                .dark .runner-sack-btn .mini-sack-time{color:#cbd5e1}

                /* בחירה – ירוק עדין */
                #sack-carrier-container .runner-sack-btn.selected{
                  background:#d1fbe8 !important;
                  color:#065f46 !important;
                  border-color:#059669 !important;
                  box-shadow:0 0 0 1px #059669 inset,0 2px 4px rgba(0,0,0,.08);
                }
                #sack-carrier-container .runner-sack-btn.selected:hover{
                  background:#baf4d9 !important;
                }
                .dark #sack-carrier-container .runner-sack-btn.selected{
                  background:#065f46 !important;
                  border-color:#047857 !important;
                  color:#ecfdf5 !important;
                  box-shadow:0 0 0 1px #047857 inset;
                }
                .dark #sack-carrier-container .runner-sack-btn.selected:hover{
                  background:#056c41 !important;
                }
            `;
            document.head.appendChild(s);
        }

        // רצים פעילים (שטרם סומנו כסיימו)
        const activeRunners = state.runners
            .filter(r => r.shoulderNumber && !state.crawlingDrills.runnerStatuses[r.shoulderNumber])
            .sort((a,b)=>a.shoulderNumber-b.shoulderNumber);

        // אם היו טיימרים פעילים – ממשיכים אותם
        activeRunners.forEach(r => {
            if (state.crawlingDrills.activeSackCarriers.includes(r.shoulderNumber)) {
                startSackTimer(r.shoulderNumber);
            }
        });

        // כפתורי בחירת נושאי שק (נשאר כרגיל)
        const sackCarrierHtml = `
<div id="sack-carrier-container" class="my-6 p-4 rounded-lg">
    <h3 class="text-xl font-semibold mb-4 text-center">בחר את נושאי השק (עד ${CONFIG.MAX_SACK_CARRIERS})</h3>
    <div class="cs-grid-3min">
        ${activeRunners.map(r => {
            const sn = r.shoulderNumber;
            const isSelected = state.crawlingDrills.activeSackCarriers.includes(sn);
            const canSelect = isSelected || state.crawlingDrills.activeSackCarriers.length < CONFIG.MAX_SACK_CARRIERS;
            const sackData = state.crawlingDrills.sackCarriers?.[sn];
            const timeText = isSelected && sackData
                ? formatTime_no_ms(sackData.totalTime + (sackData.startTime ? Date.now()-sackData.startTime : 0))
                : (isSelected ? '00:00' : '');
            return `<button class="runner-sack-btn ${isSelected ? 'selected' : ''}"
                        data-shoulder-number="${sn}" ${!canSelect ? 'disabled' : ''}>
                        <span>${sn}</span>
                        <span class="mini-sack-time" id="mini-sack-timer-${sn}">${timeText}</span>
                    </button>`;
        }).join('')}
    </div>
</div>`;

        // אוסף כל הנשאים הפעילים + כל מי שיש לו זמן שנשמר (כולל אם כבר לא אקטיבי)
        const sackCarrierSet = new Set(state.crawlingDrills.activeSackCarriers || []);
        const sackCarriersState = state.crawlingDrills.sackCarriers || {};
        Object.entries(sackCarriersState).forEach(([sn, data]) => {
            if (data && (data.totalTime > 0 || data.startTime)) {
                sackCarrierSet.add(parseInt(sn,10));
            }
        });

        // בניית המערך הסופי לתצוגה (גם אם הרץ לא בין activeRunners)
        const displayedSackCarriers = state.runners
            .filter(r => r.shoulderNumber && sackCarrierSet.has(r.shoulderNumber))
            .sort((a,b)=>a.shoulderNumber - b.shoulderNumber);

        const carriersListHtml = `
<div class="arrival-header">
  <div class="flex items-center gap-2">
    <span class="font-semibold text-xs md:text-sm whitespace-nowrap" style="min-width:88px;text-align:right;">מספר כתף</span>
    <span class="flex-1 text-center font-semibold text-xs md:text-sm">הערות כלליות</span>
    <span class="font-semibold text-xs md:text-sm whitespace-nowrap" style="min-width:88px;text-align:left;">זמן</span>
  </div>
</div>
<div id="arrival-list" class="space-y-2">
  ${
    displayedSackCarriers.length
      ? displayedSackCarriers.map((r,i)=>{
          const sn = r.shoulderNumber;
          const sackData = state.crawlingDrills.sackCarriers[sn];
          const timeText = sackData
              ? formatTime_no_ms(sackData.totalTime + (sackData.startTime ? Date.now()-sackData.startTime : 0))
              : '00:00';
          const gc = state.generalComments?.[sn] || '';
          return `<div class="bg-white p-3 rounded-lg shadow-sm flex items-center gap-2">
              <span class="font-bold text-gray-700 text-sm md:text-base whitespace-nowrap" style="min-width:88px;text-align:right;">${i+1}. ${sn}</span>
              <span class="flex-1">
                <input class="gc-input" type="text" data-shoulder-number="${sn}"
                       value="${(gc||'').replace(/"/g,'&quot;')}" placeholder="הערה כללית...">
              </span>
              <span class="font-mono text-gray-600 text-sm md:text-base whitespace-nowrap"
                    style="min-width:88px;text-align:left;" id="sack-timer-${sn}">${timeText}</span>
            </div>`;
        }).join('')
      : `<div class="text-center text-sm text-gray-500 py-4">עדיין לא נבחרו נושאי שק</div>`
  }
</div>
<p class="mt-4 text-center text-xs text-gray-500">מוצגים רק המתמודדים שסחבו שק</p>`;

        contentDiv.innerHTML = `
<h2 class="text-2xl font-semibold mb-4 text-center mt-6 text-blue-500">ניהול נשיאת שק</h2>
${sackCarrierHtml}
${carriersListHtml}
`;

        // מאזינים לבחירת נשאי שק
        document.querySelectorAll('.runner-sack-btn').forEach(btn =>
            btn.addEventListener('click', handleSackCarrierToggle)
        );

        // מאזינים להערות
        contentDiv.querySelectorAll('.gc-input').forEach(inp=>{
            inp.addEventListener('input', e=>{
                const sn = +e.target.dataset.shoulderNumber;
                const v = e.target.value || '';
                state.generalComments = state.generalComments || {};
                if (!v.trim()) delete state.generalComments[sn];
                else state.generalComments[sn] = v;
                saveState();
            });
        });

        // מסירים פוטר ניווט אם קיים (לא צריך בר תחתון)
        const footer = document.getElementById('footer-navigation');
        if (footer) footer.innerHTML = '';

        // עדכון טיימרים קטנים
        function updateMiniSackTimers(){
            (state.crawlingDrills.activeSackCarriers || []).forEach(sn=>{
                const data = state.crawlingDrills.sackCarriers?.[sn];
                if(!data) return;
                const el = document.getElementById('mini-sack-timer-'+sn);
                if(!el) return;
                el.textContent = formatTime_no_ms(
                    data.totalTime + (data.startTime ? Date.now()-data.startTime : 0)
                );
            });
        }
        clearInterval(window._miniSackTimersInterval);
        window._miniSackTimersInterval = setInterval(updateMiniSackTimers,1000);
        updateMiniSackTimers();
    };
})();
