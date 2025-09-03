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
                .runner-sack-btn{display:inline-flex;align-items:center;justify-content:center;padding:8px 10px;border:1px solid rgba(0,0,0,.15);border-radius:8px;background:#e5e7eb;color:#111827;cursor:pointer}
                .runner-sack-btn:hover{background:#d1d5db}
                .runner-sack-btn.selected{background:#60a5fa;color:#fff;border-color:#3b82f6}
                .dark .runner-sack-btn{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.18);color:inherit}
                .dark .runner-sack-btn:hover{background:rgba(255,255,255,.12)}
                .dark .runner-sack-btn.selected{background:#2563eb;border-color:#1d4ed8;color:#fff}
                #next-crawl-btn-inline{background:#16a34a;color:#fff;border:0;border-radius:8px}
                #next-crawl-btn-inline:hover{background:#15803d}
            `;
            document.head.appendChild(s);
        }

        // קריאת ההערות רק מה-Config
        const groupCommentPresets = (window.CONFIG && CONFIG.CRAWLING_GROUP_COMMON_COMMENTS) || { good: [], neutral: [], bad: [] };
        if (!groupCommentPresets.good.length && !groupCommentPresets.neutral.length && !groupCommentPresets.bad.length) {
            console.warn('CRAWLING_GROUP_COMMON_COMMENTS is empty or missing. Load js/config/crawling-config.js before this page.');
        }
        const buildPresetOptions = () => {
            const mk = (label, arr) => (arr && arr.length)
                ? `<optgroup label="${label}">${arr.map(t => `<option value="${t}">${t}</option>`).join('')}</optgroup>`
                : '';
            return [
                `<option value="">בחר הערה…</option>`,
                mk('טובות', groupCommentPresets.good),
                mk('בינוניות', groupCommentPresets.neutral),
                mk('רעות', groupCommentPresets.bad)
            ].join('');
        };
        const presetOptionsHtml = buildPresetOptions();

        const activeRunners = state.runners
            .filter(runner => runner.shoulderNumber && !state.crawlingDrills.runnerStatuses[runner.shoulderNumber])
            .sort((a, b) => a.shoulderNumber - b.shoulderNumber);

        // הפעלת טיימרים פעילים (אם יש)
        activeRunners.forEach(runner => {
            if (state.crawlingDrills.activeSackCarriers.includes(runner.shoulderNumber)) {
                startSackTimer(runner.shoulderNumber);
            }
        });

        // כפתורי בחירת נושאי שק – 3 בשורה
        const sackCarrierHtml = `
<div id="sack-carrier-container" class="my-6 p-4 rounded-lg">
    <h3 class="text-xl font-semibold mb-4 text-center">בחר את נושאי השק (עד ${CONFIG.MAX_SACK_CARRIERS})</h3>
    <div class="cs-grid-3min">
        ${activeRunners.map(runner => {
            const isSelected = state.crawlingDrills.activeSackCarriers.includes(runner.shoulderNumber);
            const canSelect = isSelected || state.crawlingDrills.activeSackCarriers.length < CONFIG.MAX_SACK_CARRIERS;
            return `<button class="runner-sack-btn ${isSelected ? 'selected' : ''} bg-gray-300 hover:bg-gray-400 font-bold text-xl" data-shoulder-number="${runner.shoulderNumber}" ${!canSelect ? 'disabled' : ''}>
                        ${runner.shoulderNumber} <span>🎒</span>
                    </button>`;
        }).join('')}
    </div>
</div>`;

        // כותרת סכימה כמו בספרינטים
        const summaryHeaderHtml = `
            <div class="arrival-header">
                <div class="flex items-center gap-2">
                    <span class="font-semibold text-xs md:text-sm whitespace-nowrap" style="min-width:88px;text-align:right;">מספר כתף</span>
                    <span class="flex-1 text-center font-semibold text-xs md:text-sm">הערות כלליות</span>
                    <span class="font-semibold text-xs md:text-sm whitespace-nowrap" style="min-width:88px;text-align:left;">זמן</span>
                </div>
            </div>`;

        // שורות סכימה: ללא dropdown של הערות נפוצות
        const summaryListHtml = `
            <div id="arrival-list" class="space-y-2">
                ${activeRunners.map((runner, index) => {
                    const sn = runner.shoulderNumber;
                    const sackData = state.crawlingDrills.sackCarriers[sn];
                    const timeText = sackData
                        ? formatTime_no_ms(sackData.totalTime + (sackData.startTime ? Date.now() - sackData.startTime : 0))
                        : '00:00';
                    const gc = state.generalComments?.[sn] || '';
                    return `
                        <div class="bg-white p-3 rounded-lg shadow-sm flex items-center gap-2">
                            <span class="font-bold text-gray-700 text-sm md:text-base whitespace-nowrap" style="min-width:88px;text-align:right;">${index + 1}. ${sn}</span>
                            <span class="flex-1">
                                <input class="gc-input" type="text" data-shoulder-number="${sn}" value="${(gc || '').replace(/"/g, '&quot;')}" placeholder="הערה כללית...">
                            </span>
                            <span class="font-mono text-gray-600 text-sm md:text-base whitespace-nowrap" style="min-width:88px;text-align:left;" id="sack-timer-${sn}">${timeText}</span>
                        </div>`;
                }).join('')}
            </div>
        `;

        contentDiv.innerHTML = `
<h2 class="text-2xl font-semibold mb-4 text-center mt-6 text-blue-500">ניהול נשיאת שק</h2>
${sackCarrierHtml}
${summaryHeaderHtml}
${summaryListHtml}
<div class="flex justify-between items-center my-4 p-2 bg-gray-200 rounded-lg shadow-inner">
    <div></div><span>זחילות מתמשך 1/1</span>
    <button id="next-crawl-btn-inline" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">התחל ספרינט זחילות <span class="text-xl">&rarr;</span></button>
</div>`;

        // בחירת נושאי שק
        document.querySelectorAll('.runner-sack-btn').forEach(btn => btn.addEventListener('click', handleSackCarrierToggle));

        // עדכון הערות כלליות
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

        // ניווט לעמוד ספרינט זחילות
        document.getElementById('next-crawl-btn-inline').addEventListener('click', () => {
            const go = () => {
                state.currentPage = PAGES.CRAWLING_SPRINT;
                state.crawlingDrills.currentSprintIndex = 0;
                saveState();
                render();
            };
            const intercepted = confirmLeaveCrawlingComments(go);
            if (!intercepted) go();
        });
    };
})();

// ביטול רינדור UI בתחתית העמוד – הכל עבר לקומפוננטת "הערה מהירה"
(function () {
  function noopCrawlingCommentsRender() {
    const content = document.getElementById('content');
    if (content) content.innerHTML = '';
    const footer = document.getElementById('footer-navigation');
    if (footer) footer.innerHTML = '';
  }

  // אם הפונקציה קיימת – נחליף אותה; אחרת נרשום כגיבוי גלובלי
  if (typeof window.renderCrawlingDrillsCommentsPage === 'function') {
    window.renderCrawlingDrillsCommentsPage = noopCrawlingCommentsRender;
  } else {
    window.renderCrawlingDrillsCommentsPage = noopCrawlingCommentsRender;
  }
})();