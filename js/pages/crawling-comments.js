(function () {
    // UPDATED: שיפור האזנה לאירועי שינוי רצים
    if (!window.__crawlingGroupCommentsRunnerEventsBound) {
        window.__crawlingGroupCommentsRunnerEventsBound = true;
        
        // האזנה לאירועים של שינוי רצים
        ['runnersChanged', 'activeRunnersChanged', 'runnerEdited', 'runnerUpdated'].forEach(evt => {
            window.addEventListener(evt, () => {
                try {
                    if (state.currentPage === PAGES.CRAWLING_COMMENTS) {
                        // עיכוב קצר כדי לוודא שהנתונים התעדכנו
                        setTimeout(() => {
                            console.log('Refreshing crawling page due to:', evt);
                            window.Pages.renderCrawlingDrillsCommentsPage();
                        }, 150);
                    }
                } catch (e) { 
                    console.warn('Error refreshing crawling page:', e);
                }
            });
        });
        
        // האזנה נוספת לשינויים במידע הרצים דרך localStorage
        window.addEventListener('storage', (e) => {
            if (e.key === 'gibushAppState' && state.currentPage === PAGES.CRAWLING_COMMENTS) {
                setTimeout(() => {
                    console.log('Refreshing crawling page due to storage change');
                    window.Pages.renderCrawlingDrillsCommentsPage();
                }, 200);
            }
        });
        
        // בדיקה מחזורית לשינויים (גיבוי)
        let lastRunnersHash = '';
        setInterval(() => {
            if (state.currentPage === PAGES.CRAWLING_COMMENTS) {
                const currentHash = JSON.stringify(state.runners || []);
                if (currentHash !== lastRunnersHash) {
                    lastRunnersHash = currentHash;
                    console.log('Detected runners change via polling');
                    window.Pages.renderCrawlingDrillsCommentsPage();
                }
            }
        }, 2000);
    }

    window.Pages = window.Pages || {};
    window.Pages.renderCrawlingDrillsCommentsPage = function renderCrawlingDrillsCommentsPage() {
        headerTitle.textContent = 'זחילה קבוצתית';

        // NEW: load ArrivalRows component if needed (for unified table look like sprint pages)
        if (!window.ArrivalRows || !window.ArrivalRows.render){
            if (!document.querySelector('script[data-arrival-rows]')) {
                const s = document.createElement('script');
                s.src = 'js/components/arrivalRows.js';
                s.async = true; s.dataset.arrivalRows = 'true';
                s.onload = () => setTimeout(()=>window.Pages.renderCrawlingDrillsCommentsPage(),0);
                document.head.appendChild(s);
            } else {
                // script already loading – try again shortly
                setTimeout(()=>window.Pages.renderCrawlingDrillsCommentsPage(), 60);
            }
            return; // wait until component available
        }

        if (!document.getElementById('crawling-comments-style')) {
            const s = document.createElement('style');
            s.id = 'crawling-comments-style';
            s.textContent = `
                .cs-grid-3min{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
                @media (min-width:640px){.cs-grid-3min{grid-template-columns:repeat(5,minmax(0,1fr))}}
                .arrival-header{padding:4px 6px;color:#6b7280}
                .gc-input{width:100%;height:34px;line-height:34px;font-size:13px;padding:0 8px;text-align:right;border:1px solid rgba(0,0,0,.15);border-radius:8px;background:#fff;color:#111827}
                .dark .gc-input{background:rgba(255,255,255,.06);color:inherit;border-color:rgba(255,255,255,.18)}
                .runner-sack-btn{
                  display:inline-flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;
                  width:100%;min-height:72px;padding:10px 8px;background:#e5e7eb;color:#111827;
                  border:1px solid rgba(0,0,0,.15);border-radius:10px;font-weight:700;font-size:20px;
                  cursor:pointer;transition:.15s background,.15s box-shadow,.15s transform;box-shadow:0 1px 2px rgba(0,0,0,.15);user-select:none;
                }
                .runner-sack-btn:hover{background:#d9dbe0}
                .runner-sack-btn:active{transform:translateY(1px);box-shadow:0 0 0 rgba(0,0,0,.15)}
                .runner-sack-btn .mini-sack-time{
                  font-size:11px;line-height:1;font-family:monospace;color:#374151;opacity:.85;margin-top:2px;
                }
                /* הסתרה רק אם לא נבחר ואין לו זמן שמור */
                .runner-sack-btn:not(.selected):not(.has-sack-time) .mini-sack-time{visibility:hidden}
                .dark .runner-sack-btn{background:#374151;color:#f1f5f9;border-color:rgba(255,255,255,.18)}
                .dark .runner-sack-btn:hover{background:#425065}
                .dark .runner-sack-btn .mini-sack-time{color:#cbd5e1}
                #sack-carrier-container .runner-sack-btn.selected{
                  background:#d1fbe8 !important;color:#065f46 !important;border-color:#059669 !important;
                  box-shadow:0 0 0 1px #059669 inset,0 2px 4px rgba(0,0,0,.08);
                }
                #sack-carrier-container .runner-sack-btn.selected:hover{background:#baf4d9 !important}
                .dark #sack-carrier-container .runner-sack-btn.selected{
                  background:#065f46 !important;border-color:#047857 !Important;color:#ecfdf5 !important;box-shadow:0 0 0 1px #047857 inset;
                }
                .dark #sack-carrier-container .runner-sack-btn.selected:hover{background:#056c41 !important}
                .gc-input{display:none} /* הוסתר – מחליפים בכפתור */
                .gc-open-btn{
                  display:inline-flex;align-items:center;justify-content:flex-start;
                  width:100%;min-height:38px;padding:6px 10px;
                  background:#f3f4f6;color:#374151;font-size:12px;font-weight:500;
                  border:1px solid #d1d5db;border-radius:8px;cursor:pointer;
                  transition:.15s background,.15s border-color;
                  line-height:1.2;text-align:right;direction:rtl;
                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                }
                .gc-open-btn:hover{background:#e5e7eb;border-color:#9ca3af}
                .gc-open-btn.has-text{background:#eefdf6;color:#065f46;border-color:#059669}
                .gc-open-btn.has-text:hover{background:#daf8eb}
                .dark .gc-open-btn{background:#374151;color:#e2e8f0;border-color:#4b5563}
                .dark .gc-open-btn:hover{background:#425065;border-color:#64748b}
                .dark .gc-open-btn.has-text{background:#065f46;color:#ecfdf5;border-color:#047857}
                .dark .gc-open-btn.has-text:hover{background:#056c41}

                /* מודאל הערה בראש המסך */
                .gc-modal-top-backdrop{
                  position:fixed;inset:0;z-index:600;display:none;
                  background:rgba(0,0,0,.45);
                }
                .gc-modal-top{
                  position:absolute;top:12px;right:50%;transform:translateX(50%);
                  width:clamp(300px,92vw,580px);background:#fff;color:#111827;
                  border-radius:18px;padding:18px 18px 14px;
                  box-shadow:0 8px 28px -6px rgba(0,0,0,.45);
                  animation:gcSlideDown .28s ease;
                }
                @keyframes gcSlideDown{from{opacity:0;transform:translate(50%,-10px)}to{opacity:1;transform:translate(50%,0)}}
                .dark .gc-modal-top{background:#1f2937;color:#f1f5f9}
                .gc-modal-top textarea{
                  width:100%;min-height:150px;resize:vertical;
                  background:#f9fafb;border:1px solid #d1d5db;border-radius:10px;
                  padding:10px 12px;font-size:14px;line-height:1.4;color:#111827;outline:none;
                  direction:rtl;
                }
                .gc-modal-top textarea:focus{border-color:#059669;box-shadow:0 0 0 1px #059669}
                .dark .gc-modal-top textarea{background:#374151;border-color:#4b5563;color:#f1f5f9}
                .dark .gc-modal-top textarea:focus{border-color:#10b981;box-shadow:0 0 0 1px #10b981}
                .gc-modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
                .gc-modal-header h3{font-size:16px;font-weight:700;margin:0}
                .gc-close{
                  background:none;border:none;color:inherit;font-size:20px;cursor:pointer;line-height:1;
                  padding:2px 6px;border-radius:6px;
                }
                .gc-close:hover{background:rgba(0,0,0,.06)}
                .dark .gc-close:hover{background:rgba(255,255,255,.08)}
                .gc-actions{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:12px;flex-wrap:wrap}
                .gc-btn{
                  display:inline-flex;align-items:center;gap:6px;
                  padding:8px 14px;font-size:14px;font-weight:600;border-radius:10px;
                  cursor:pointer;border:1px solid transparent;transition:.15s;
                }
                .gc-btn-save{background:#059669;color:#fff}
                .gc-btn-save:hover{background:#047857}
                .gc-btn-cancel{background:#e5e7eb;color:#374151}
                .gc-btn-cancel:hover{background:#d1d5db}
                .dark .gc-btn-cancel{background:#374151;color:#e2e8f0}
                .dark .gc-btn-cancel:hover{background:#425065}
                .gc-btn-mic{background:#f3f4f6;color:#374151}
                .gc-btn-mic:hover{background:#e5e7eb}
                .gc-btn-mic.recording{background:#dc2626;color:#fff}
                .dark .gc-btn-mic{background:#374151;color:#e2e8f0}
                .dark .gc-btn-mic:hover{background:#425065}
                .dark .gc-btn-mic.recording{background:#b91c1c}

                /* === בועת אינדיקציית הערות – אייקון בועה ממולא עם מספר בפנים === */
                .runner-sack-btn{position:relative;padding-left:45px;} /* מקום לאייקון החדש - הוגדל מ-38px */
                .runner-sack-btn .comment-mini-indicator{
                  position:absolute;top:4px;left:4px;
                  width:37px;height:35px; /* הוגדל מ-30px × 28px */
                  display:flex;align-items:center;justify-content:center;
                  font-weight:700;line-height:1;
                  user-select:none;
                }
                .runner-sack-btn .comment-mini-indicator .bubble-wrapper{
                  position:relative;width:100%;height:100%;
                  display:flex;align-items:center;justify-content:center;
                }
                .runner-sack-btn .comment-mini-indicator .bubble-svg{
                  width:100%;height:100%;display:block;
                }
                .runner-sack-btn .comment-mini-indicator .bubble-fill{
                  /* צבע מתעדכן לפי רמה */
                  transition:fill .25s;
                }
                .runner-sack-btn .comment-mini-indicator .cm-count{
                  position:absolute;
                  top:50%;left:50%;
                  transform:translate(-50%,-70%); /* הועלה מ--62% ל--70% */
                  font-size:13px;
                  pointer-events:none;
                  text-shadow:0 1px 2px rgba(0,0,0,.35);
                  color:#fff;
                }
                .runner-sack-btn .comment-mini-indicator.count-0 .cm-count{display:none;}
                .runner-sack-btn .comment-mini-indicator.count-0::after{
                  content:'+';position:absolute;
                  top:50%;left:50%;
                  transform:translate(-50%,-78%); /* הועלה מ--70% ל--78% */
                  font-size:18px;font-weight:400; /* הוגדל מ-16px */
                  text-shadow:0 1px 2px rgba(0,0,0,.35);
                  color:#fff;
                }

                /* רמות צבע (fill) + צבע טקסט (color) – תואם styles.css */
                .runner-sack-btn .comment-mini-indicator.level-0 .bubble-fill{fill:#fecaca;}
                .runner-sack-btn .comment-mini-indicator.level-0{color:#b91c1c;}

                .runner-sack-btn .comment-mini-indicator.level-1 .bubble-fill{fill:#fed7aa;}
                .runner-sack-btn .comment-mini-indicator.level-1{color:#9a3412;}

                .runner-sack-btn .comment-mini-indicator.level-2 .bubble-fill{fill:#fde047;}
                .runner-sack-btn .comment-mini-indicator.level-2{color:#854d0e;}

                .runner-sack-btn .comment-mini-indicator.level-3 .bubble-fill{fill:#fef9c3;}
                .runner-sack-btn .comment-mini-indicator.level-3{color:#713f12;}

                .runner-sack-btn .comment-mini-indicator.level-4 .bubble-fill{fill:#ecfccb;}
                .runner-sack-btn .comment-mini-indicator.level-4{color:#3f6212;}

                .runner-sack-btn .comment-mini-indicator.level-5 .bubble-fill{fill:#e7fef3;}
                .runner-sack-btn .comment-mini-indicator.level-5{color:#166534;}

                /* Dark */
                .dark .runner-sack-btn .comment-mini-indicator.level-0 .bubble-fill{fill:#641414;}
                .dark .runner-sack-btn .comment-mini-indicator.level-0{color:#fecaca;}

                .dark .runner-sack-btn .comment-mini-indicator.level-1 .bubble-fill{fill:#5a250c;}
                .dark .runner-sack-btn .comment-mini-indicator.level-1{color:#fed7aa;}

                .dark .runner-sack-btn .comment-mini-indicator.level-2 .bubble-fill{fill:#5a3a05;}
                .dark .runner-sack-btn .comment-mini-indicator.level-2{color:#fde68a;}

                .dark .runner-sack-btn .comment-mini-indicator.level-3 .bubble-fill{fill:#55520a;}
                .dark .runner-sack-btn .comment-mini-indicator.level-3{color:#fef08a;}

                .dark .runner-sack-btn .comment-mini-indicator.level-4 .bubble-fill{fill:#25420a;}
                .dark .runner-sack-btn .comment-mini-indicator.level-4{color:#d9f99d;}

                .dark .runner-sack-btn .comment-mini-indicator.level-5 .bubble-fill{fill:#094226;}
                .dark .runner-sack-btn .comment-mini-indicator.level-5{color:#bbf7d0;}

                /* גרסת comment-level (הכפול) – הותאמה גם היא */
                .comment-mini-indicator.comment-level-0 .bubble-fill{fill:#fecaca;}
                .comment-mini-indicator.comment-level-1 .bubble-fill{fill:#fed7aa;}
                .comment-mini-indicator.comment-level-2 .bubble-fill{fill:#fde047;}
                .comment-mini-indicator.comment-level-3 .bubble-fill{fill:#fef9c3;}
                .comment-mini-indicator.comment-level-4 .bubble-fill{fill:#ecfccb;}
                .comment-mini-indicator.comment-level-5 .bubble-fill{fill:#e7fef3;}

                .dark .comment-mini-indicator.comment-level-0 .bubble-fill{fill:#641414;}
                .dark .comment-mini-indicator.comment-level-1 .bubble-fill{fill:#5a250c;}
                .dark .comment-mini-indicator.comment-level-2 .bubble-fill{fill:#5a3a05;}
                .dark .comment-mini-indicator.comment-level-3 .bubble-fill{fill:#55520a;}
                .dark .comment-mini-indicator.comment-level-4 .bubble-fill{fill:#25420a;}
                .dark .comment-mini-indicator.comment-level-5 .bubble-fill{fill:#094226;}

                /* ADDED: לחצן הערות בטבלה – רוחב מלא, שורה אחת, פינות מעוגלות קלות */
                #arrival-list .table-comment-btn{
                  display:block;
                  width:100%;
                  padding:6px 10px;
                  border-radius:6px;
                  text-align:right;
                  white-space:nowrap;
                  overflow:hidden;
                  text-overflow:ellipsis;
                  line-height:1.2;
                  font-size:12px;
                  font-weight:500;
                }
                #arrival-list .table-comment-btn.comment-btn-empty{opacity:.7;}
            `;
            document.head.appendChild(s);
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

        function truncateCrawlCommentSummary(raw, max = 24) {
            const EMPTY = 'כתוב הערה...';
            if (raw == null) return EMPTY;
            let str;
            if (Array.isArray(raw)) {
                const cleaned = raw.filter(c => c && c.trim());
                if (!cleaned.length) return EMPTY;
                str = cleaned.join(' | ');
            } else {
                str = String(raw || '').trim();
                if (!str) return EMPTY;
            }
            str = str.replace(/\s+/g, ' ');
            return str.length > max ? str.slice(0, max) + '…' : str;
        }

        function getCommentCount(sn){
            const raw = state.generalComments?.[sn];
            if (!raw) return 0;
            if (Array.isArray(raw)) return raw.filter(c=>c && c.trim()).length;
            return String(raw).trim() ? 1 : 0;
        }
        function updateMiniCommentIndicator(sn){
            const el = document.querySelector(`.comment-mini-indicator[data-mini-comment="${sn}"]`);
            if(!el) return;
            const count = getCommentCount(sn);
            const level = Math.min(count,5);
            for(let i=0;i<=5;i++) el.classList.remove(`comment-level-${i}`);
            el.classList.add(`comment-level-${level}`);
            const cntEl = el.querySelector('.cm-count');
            if (cntEl) cntEl.textContent = count;
        }
        window.updateMiniCommentIndicator = updateMiniCommentIndicator;

        // UPDATED: שימוש ב-updateActiveRunners + activeShoulders לסינון עקבי עם רענון מחדש
        // FIXED: שיפור לוגיקת זיהוי מתמודדים פעילים
        if (typeof window.updateActiveRunners === 'function') {
            try { 
                window.updateActiveRunners(); 
            } catch (e) { /* silent */ }
        }
        
        // FIXED: הבטחה שיש מבנה נתונים תקין
        if (!state.crawlingDrills) {
            state.crawlingDrills = {
                activeSackCarriers: [],
                sackCarriers: {},
                runnerStatuses: {}
            };
        }
        
        // FIXED: סינון מתמודדים פעילים עם בדיקה משופרת
        const allRunners = Array.isArray(state.runners) ? state.runners : [];
        const runnerStatuses = state.crawlingDrills.runnerStatuses || {};
        
        const activeRunners = allRunners
            .filter(r => {
                if (!r || r.shoulderNumber == null) return false;
                const sn = String(r.shoulderNumber).trim();
                if (!sn) return false;
                
                // בדיקה אם הרץ פרש או הוסר זמנית
                if (runnerStatuses[sn] === 'retired' || runnerStatuses[sn] === 'temp_removed') return false;
                
                // בדיקות נוספות לסטטוס לא פעיל
                if (r.active === false || r.isActive === false || r.retired || r.withdrawn) return false;
                
                return true;
            })
            .sort((a, b) => Number(a.shoulderNumber) - Number(b.shoulderNumber));

        console.log('Active runners for crawling:', activeRunners.map(r => r.shoulderNumber));

        // אם היו טיימרים פעילים – ממשיכים אותם
        activeRunners.forEach(r => {
            if (state.crawlingDrills.activeSackCarriers.includes(r.shoulderNumber)) {
                startSackTimer(r.shoulderNumber);
            }
        });

        // FIXED: שיפור בניית כפתורי נושאי שק
        const sackCarrierHtml = `
<div id="sack-carrier-container" class="my-6 p-4 rounded-lg">
    <h3 class="text-xl font-semibold mb-4 text-center">בחר את נושאי השק (עד ${CONFIG.MAX_SACK_CARRIERS})</h3>
    <div class="cs-grid-3min">
        ${activeRunners.map(r => {
            const sn = String(r.shoulderNumber);
            const isSelected = Array.isArray(state.crawlingDrills.activeSackCarriers) && 
                              state.crawlingDrills.activeSackCarriers.includes(sn);
            const canSelect = isSelected || 
                             (Array.isArray(state.crawlingDrills.activeSackCarriers) && 
                              state.crawlingDrills.activeSackCarriers.length < CONFIG.MAX_SACK_CARRIERS);
            
            const sackData = state.crawlingDrills.sackCarriers?.[sn];
            const hasTime = !!(sackData && (sackData.totalTime > 0 || sackData.startTime));
            const timeText = hasTime
                ? formatTime_no_ms(sackData.totalTime + (sackData.startTime ? Date.now()-sackData.startTime : 0))
                : (isSelected ? '00:00' : '');

            // חישוב כמות הערות
            const raw = state.generalComments?.[sn];
            let arr = Array.isArray(raw) ? raw.filter(c=>c && c.trim()) :
                      (raw && String(raw).trim() ? [String(raw).trim()] : []);
            const cCount = arr.length;
            const level = Math.min(cCount,5);

            console.log(`Button for ${sn}: selected=${isSelected}, canSelect=${canSelect}, hasTime=${hasTime}`);

            return `<button class="runner-sack-btn ${isSelected ? 'selected' : ''} ${hasTime ? 'has-sack-time' : ''}"
                        data-shoulder-number="${sn}" ${!canSelect ? 'disabled' : ''}>
                        <span class="comment-mini-indicator comment-level-${level}" data-mini-comment="${sn}" aria-label="הערות: ${cCount}">
                          <svg class="bubble-svg" viewBox="0 0 24 24" aria-hidden="true">
                            <path class="bubble-fill" d="M4 3h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-6l-4.6 4.6c-.62.62-1.4.18-1.4-.7V16H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2z"/>
                          </svg>
                          <span class="cm-count">${cCount}</span>
                        </span>
                        <span>${sn}</span>
                        <span class="mini-sack-time" id="mini-sack-timer-${sn}">${timeText}</span>
                    </button>`;
        }).join('')}
    </div>
</div>`;

        // אוסף כל הנשאים הפעילים + כל מי שיש לו זמן שנשמר (כולל אם כבר לא אקטיבי)
        // FIXED: שיפור בניית רשימת נושאי שק שהוצגו
        const sackCarrierSet = new Set();
        
        // הוספת כל הנושאים הפעילים
        if (Array.isArray(state.crawlingDrills.activeSackCarriers)) {
            state.crawlingDrills.activeSackCarriers.forEach(sn => sackCarrierSet.add(String(sn)));
        }
        
        // הוספת כל מי שיש לו זמן שמור (גם אם כבר לא פעיל)
        const sackCarriersState = state.crawlingDrills.sackCarriers || {};
        Object.entries(sackCarriersState).forEach(([sn, data]) => {
            if (data && (data.totalTime > 0 || data.startTime)) {
                sackCarrierSet.add(String(sn));
            }
        });

        // בניית המערך הסופי לתצוגה
        const displayedSackCarriers = allRunners
            .filter(r => r && r.shoulderNumber != null && sackCarrierSet.has(String(r.shoulderNumber)))
            .sort((a,b) => Number(a.shoulderNumber) - Number(b.shoulderNumber));

        console.log('Displayed sack carriers:', displayedSackCarriers.map(r => r.shoulderNumber));
        console.log('Sack carrier set:', Array.from(sackCarrierSet));

        // REPLACED: carriersListHtml custom markup -> unified ArrivalRows table (ALL runners, not only carriers)
        // Build arrivals array for ALL active (non-retired) runners sorted by descending total sack carrying time
        function computeEffectiveTime(sn){
            const d = state.crawlingDrills.sackCarriers?.[sn];
            if (!d) return 0;
            return d.totalTime + (d.startTime ? Date.now()-d.startTime : 0);
        }
        const allDisplayRunners = activeRunners; // כולל כולם (לא רק מי שסחב בפועל)
        const arrivalsData = allDisplayRunners
            .map(r => ({ shoulderNumber: String(r.shoulderNumber), finishTime: computeEffectiveTime(String(r.shoulderNumber)) }))
            .sort((a,b)=> b.finishTime - a.finishTime); // גדול קודם

        const arrivalsBlockHtml = ArrivalRows.render({
            arrivals: arrivalsData,
            getComment: sn => state.generalComments?.[sn],
            formatTime: formatTime_no_ms,
            showHeader: true,
            labels: { shoulder:'מספר כתף', comment:'הערות', time:'זמן נשיאה' },
            listId: 'sack-arrival-list', // CHANGED: unique id to avoid collisions with heat page
            hideCommentsColumn: false,
            hideRankColumn: true // NEW: הסתרת עמודת המיקום בטבלת זחילות קבוצתית
        });

        contentDiv.innerHTML = `
<h2 class="text-2xl font-semibold mb-4 text-center mt-6 text-blue-500">ניהול נשיאת שק</h2>
${sackCarrierHtml}
${arrivalsBlockHtml}
<p class="mt-2 text-center text-xs text-gray-500">הטבלה מציגה את כל המתמודדים – מסודר לפי זמן נשיאת שק מירבי (גבוה ביותר ראשון)</p>`;

        if (!document.getElementById('gc-top-backdrop')) {
            const wrap = document.createElement('div');
            wrap.id = 'gc-top-backdrop';
            wrap.className = 'gc-modal-top-backdrop';
            wrap.innerHTML = `
              <div class="gc-modal-top" role="dialog" aria-modal="true">
                <div class="gc-modal-header">
                  <h3 id="gc-modal-title">הערה כללית</h3>
                  <button type="button" class="gc-close" data-gc-close>&times;</button>
                </div>
                <textarea id="gc-textarea" placeholder="כתוב הערה..." ></textarea>
                <div class="gc-actions">
                  <div style="display:flex;gap:8px;" id="gc-mic-area"><!-- mic cloned here --></div>
                  <div style="display:flex;gap:8px;">
                    <button type="button" class="gc-btn gc-btn-cancel" data-gc-close>ביטול</button>
                    <button type="button" class="gc-btn gc-btn-save" id="gc-save-btn">שמירה</button>
                  </div>
                </div>
              </div>`;
            document.body.appendChild(wrap);
        }

        let currentGcSn = null;
        const gcBackdrop = document.getElementById('gc-top-backdrop');
        const gcTextarea = document.getElementById('gc-textarea');
        const gcSaveBtn = document.getElementById('gc-save-btn');
        const gcMicArea = document.getElementById('gc-mic-area');

        function mountSharedMic(){
            if (!gcMicArea) return;
            const source = document.getElementById('quick-comment-mic-btn');
            if (!source) {
                // אולי עדיין לא נטען / המשתמש לא פתח את הבר – ננסה שוב רגע אחרי
                setTimeout(mountSharedMic, 300);
                return;
            }
            // מנקה קיים
            gcMicArea.innerHTML = '';
            const clone = source.cloneNode(true);
            // מזהה חדש למודאל
            clone.id = 'gc-modal-mic-btn';
            clone.classList.remove('recording');
            // להימנע מקשירת מאזינים כפולים שנוצרו בעבר
            clone._commentMicAttached = false;
            // כותב טולטיפ מתאים
            clone.title = 'הקלטת דיבור';
            gcMicArea.appendChild(clone);
            // חיבור המיקרופון האוניברסלי
            window.attachCommentMic && window.attachCommentMic(clone, gcTextarea);
        }

        function openGc(sn){
            currentGcSn = sn;
            const existing = (state.generalComments && state.generalComments[sn]) || '';
            gcTextarea.value = existing;
            gcBackdrop.style.display = 'block';
            document.body.style.overflow = 'hidden';
            mountSharedMic();
            gcTextarea.focus();
        }
        function closeGc(){
            gcBackdrop.style.display = 'none';
            document.body.style.overflow = '';
            window.stopAllCommentMics && window.stopAllCommentMics();
            currentGcSn = null;
        }
        function saveGc(){
            if (currentGcSn == null) return;
            const val = gcTextarea.value.trim();
            state.generalComments = state.generalComments || {};
            if (!val) delete state.generalComments[currentGcSn];
            else state.generalComments[currentGcSn] = val;
            saveState();
            updateMiniCommentIndicator(currentGcSn);
            // ADDED: רענון כללי כדי לעדכן רמות צבע אם משתנה האורך הכולל
            if (typeof refreshAllMiniIndicators === 'function') refreshAllMiniIndicators();
            const btn = contentDiv.querySelector(`.gc-open-btn[data-open-gc="${currentGcSn}"]`);
            if (btn){
                btn.textContent = val || 'הוסף הערה';
                btn.classList.toggle('has-text', !!val);
                btn.title = val || 'הוסף הערה';
            }
            closeGc();
        }

        contentDiv.querySelectorAll('.gc-open-btn').forEach(b=>{
            b.addEventListener('click', e=>{
                const sn = +e.currentTarget.dataset.openGc;
                openGc(sn);
            });
        });

        gcBackdrop.addEventListener('click', e=>{
            if (e.target === gcBackdrop || e.target.hasAttribute('data-gc-close')) closeGc();
        });
        gcSaveBtn.addEventListener('click', saveGc);
        document.addEventListener('keydown', e=>{
            if (e.key === 'Escape' && gcBackdrop.style.display === 'block') closeGc();
            if (e.key === 's' && (e.metaKey || e.ctrlKey) && gcBackdrop.style.display === 'block'){
                e.preventDefault(); saveGc();
            }
        });

        // UPDATED: פונקציה לטיפול בבחירת/ביטול נושאי שק עם רענון העמוד
        function handleSackCarrierToggle(e) {
            const btn = e.target.closest('.runner-sack-btn');
            if (!btn || btn.disabled) return;
            
            const sn = btn.dataset.shoulderNumber;
            if (!sn) return;
            
            const isCurrentlySelected = btn.classList.contains('selected');
            const activeSackCarriers = state.crawlingDrills.activeSackCarriers || [];
            
            if (isCurrentlySelected) {
                // הסרת בחירה - עצירת טיימר ושמירת זמן
                stopSackTimer(sn);
                state.crawlingDrills.activeSackCarriers = activeSackCarriers.filter(x => x !== sn);
                console.log(`Stopped timer for ${sn}`);
            } else {
                // בדיקה אם יש מקום לעוד נושא שק
                if (activeSackCarriers.length >= CONFIG.MAX_SACK_CARRIERS) {
                    alert(`ניתן לבחור עד ${CONFIG.MAX_SACK_CARRIERS} נושאי שק בלבד`);
                    return;
                }
                
                // הוספת בחירה - התחלת טיימר
                state.crawlingDrills.activeSackCarriers.push(sn);
                startSackTimer(sn);
                console.log(`Started timer for ${sn}`);
            }
            
            saveState();
            
            // ADDED: רענון העמוד כדי שהמתמודד יופיע ברשימה התחתונה
            setTimeout(() => {
                window.Pages.renderCrawlingDrillsCommentsPage();
            }, 100);
        }

        // ADDED: פונקציה לעדכון מצב הכפתורים
        function updateSackCarrierButtonStates() {
            const activeSackCarriers = state.crawlingDrills.activeSackCarriers || [];
            const hasSpace = activeSackCarriers.length < CONFIG.MAX_SACK_CARRIERS;
            
            document.querySelectorAll('.runner-sack-btn').forEach(btn => {
                const isSelected = btn.classList.contains('selected');
                btn.disabled = !isSelected && !hasSpace;
                
                if (btn.disabled) {
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';
                } else {
                    btn.style.opacity = '';
                    btn.style.cursor = 'pointer';
                }
            });
        }

        // ADDED: פונקציה להתחלת טיימר שק
        function startSackTimer(shoulderNumber) {
            if (!state.crawlingDrills.sackCarriers) {
                state.crawlingDrills.sackCarriers = {};
            }
            
            if (!state.crawlingDrills.sackCarriers[shoulderNumber]) {
                state.crawlingDrills.sackCarriers[shoulderNumber] = {
                    totalTime: 0,
                    startTime: null
                };
            }
            
            const data = state.crawlingDrills.sackCarriers[shoulderNumber];
            if (!data.startTime) {
                data.startTime = Date.now();
                saveState();
            }
        }

        // ADDED: פונקציה לעצירת טיימר שק
        function stopSackTimer(shoulderNumber) {
            const data = state.crawlingDrills.sackCarriers?.[shoulderNumber];
            if (!data || !data.startTime) return;
            
            const elapsed = Date.now() - data.startTime;
            data.totalTime += elapsed;
            data.startTime = null;
            saveState();
            
            console.log(`Timer stopped for ${shoulderNumber}, total time: ${formatTime_no_ms(data.totalTime)}`);
        }

        // מאזינים לבחירת נשאי שק
        document.querySelectorAll('.runner-sack-btn').forEach(btn =>
            btn.addEventListener('click', handleSackCarrierToggle)
        );

        // ADDED: עדכון מצב כפתורים ראשוני
        updateSackCarrierButtonStates();

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

        // מאזינים לכפתורי ההערות
        contentDiv.querySelectorAll('[data-comment-btn]').forEach(btn=>{
            btn.addEventListener('click', async ()=>{
                const sn = btn.getAttribute('data-comment-btn');
                try{
                    await ensureCommentsModalLoaded();
                    window.CommentsModal.open(sn, {
                        originBtn: btn,
                        truncateFn: truncateCrawlCommentSummary,
                        onSave: (val)=>{
                            state.generalComments = state.generalComments || {};
                            state.generalComments[sn] = val;
                            saveState();
                            if (window.CommentButtonUpdater) CommentButtonUpdater.update(sn);
                            updateMiniCommentIndicator(sn);
                        }
                    });
                } catch(e){
                    console.error(e);
                    alert('שגיאה בטעינת מודול ההערות');
                }
            });
        });

        // מאזינים לחיצה על בועת האינדיקציה לפתיחת commentModal
        document.querySelectorAll('.comment-mini-indicator').forEach(indicator => {
            indicator.addEventListener('click', async (e) => {
                e.stopPropagation(); // מונע פעולה על הכפתור עצמו
                const shoulderNumber = indicator.getAttribute('data-mini-comment');
                if (shoulderNumber) {
                    try {
                        await ensureCommentsModalLoaded();
                        const btn = document.querySelector(`[data-comment-btn="${shoulderNumber}"]`);
                        window.CommentsModal.open(shoulderNumber, {
                            originBtn: btn,
                            truncateFn: truncateCrawlCommentSummary,
                            onSave: (val) => {
                                state.generalComments = state.generalComments || {};
                                state.generalComments[shoulderNumber] = val;
                                saveState();
                                if (window.CommentButtonUpdater) CommentButtonUpdater.update(shoulderNumber);
                                updateMiniCommentIndicator(shoulderNumber);
                            }
                        });
                    } catch(e) {
                        console.error(e);
                        alert('שגיאה בטעינת מודול ההערות');
                    }
                }
            });
        });

        // מסירים פוטר ניווט אם קיים (לא צריך בר תחתון)
        const footer = document.getElementById('footer-navigation');
        if (footer) footer.innerHTML = '';

        // עדכון טיימרים קטנים
        function updateMiniSackTimers(){
            // GUARD: run only on this page
            if (state.currentPage !== PAGES.CRAWLING_COMMENTS) return;
            (state.crawlingDrills.activeSackCarriers || []).forEach(sn=>{
                const data = state.crawlingDrills.sackCarriers?.[sn];
                if(!data) return;
                const effective = data.totalTime + (data.startTime ? Date.now()-data.startTime : 0);
                const formatted = formatTime_no_ms(effective);
                const miniEl = document.getElementById('mini-sack-timer-'+sn);
                if(miniEl) miniEl.textContent = formatted;
            });
            // ALSO: update unified table times + reorder if needed (scoped to sack-arrival-list only)
            const rows = Array.from(document.querySelectorAll('#sack-arrival-list .arrival-row'));
            if (rows.length){
                let changedOrder = false;
                const updated = rows.map(r=>{
                    const sn = r.getAttribute('data-shoulder-number');
                    const eff = computeEffectiveTime(sn);
                    const tc = r.querySelector('.time-cell');
                    if (tc) tc.textContent = formatTime_no_ms(eff);
                    return { sn, eff };
                });
                const sorted = [...updated].sort((a,b)=> b.eff - a.eff).map(o=>o.sn);
                const current = updated.map(o=>o.sn);
                for (let i=0;i<sorted.length;i++){ if (sorted[i] !== current[i]) { changedOrder = true; break; } }
                if (changedOrder){
                    const newArrivalsData = updated.map(o=>({ shoulderNumber:o.sn, finishTime:o.eff }))
                        .sort((a,b)=> b.finishTime - a.finishTime);
                    const newHtml = ArrivalRows.render({
                        arrivals: newArrivalsData,
                        getComment: sn => state.generalComments?.[sn],
                        formatTime: formatTime_no_ms,
                        showHeader: true,
                        labels: { shoulder:'מספר כתף', comment:'הערות', time:'זמן נשיאה' },
                        listId: 'sack-arrival-list'
                    });
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = newHtml;
                    const newList = tempDiv.querySelector('#sack-arrival-list');
                    const oldList = document.getElementById('sack-arrival-list');
                    if (newList && oldList){
                        oldList.replaceWith(newList);
                        newList.querySelectorAll('[data-comment-btn]').forEach(btn=>{
                            btn.addEventListener('click', async ()=>{
                                const sn = btn.getAttribute('data-comment-btn');
                                try{ await ensureCommentsModalLoaded(); window.CommentsModal.open(sn, { originBtn: btn, truncateFn: truncateCrawlCommentSummary, onSave: (val)=>{ state.generalComments = state.generalComments || {}; state.generalComments[sn]=val; saveState(); if (window.CommentButtonUpdater) CommentButtonUpdater.update(sn);} }); } catch(e){ console.error(e); }
                            });
                        });
                    }
                }
            }
        }
        clearInterval(window._miniSackTimersInterval);
        window._miniSackTimersInterval = setInterval(updateMiniSackTimers,1000);
        updateMiniSackTimers();

        // הוספת ריענון גורף (קריאה חוזרת על כל הבועות המוצגות)
        function refreshAllMiniIndicators(){
            (displayedSackCarriers || []).forEach(r=>{
                if(r && r.shoulderNumber!=null) updateMiniCommentIndicator(r.shoulderNumber);
            });
        }

        // ריענון כאשר נלחץ כפתור שליחת "תגובה מהירה" (מהבר הגלובלי)
        document.addEventListener('click', e=>{
            if(e.target && e.target.id === 'quick-comment-send'){
                setTimeout(refreshAllMiniIndicators, 120);
            }
        });

        // ADDED: תמיכה באירועי Custom אפשריים של מודול ההערות / תגובה מהירה
        if (!window._crawlingCommentsEventsPatched){
            window._crawlingCommentsEventsPatched = true;

            // אירוע מודאל הערות גלובלי (אם נשלח ממקום אחר)
            window.addEventListener('commentsModal:saved', e=>{
                const sn = e.detail?.shoulderNumber;
                if (sn != null){
                    updateMiniCommentIndicator(sn);
                    refreshAllMiniIndicators();
                } else {
                    refreshAllMiniIndicators();
                }
            });

            // וריאציות נפוצות לשמות אירועים אפשריים של "הערה מהירה"


            // אם פקודת שליחה גלובלית נחשפת כפונקציה – עוטפים פעם אחת
            if (window.sendQuickComment && !window.sendQuickComment._wrappedForCounters){
                const originalSend = window.sendQuickComment;
                window.sendQuickComment = function wrappedQuickComment(){
                    const r = originalSend.apply(this, arguments);
                    setTimeout(refreshAllMiniIndicators, 100);
                    return r;
                };
                window.sendQuickComment._wrappedForCounters = true;
            }
        }

        // ADDED: Watcher גיבוי – מזהה שינוי במספר ההערות (חתימה קלה בלבד)
        if (!window._generalCommentsWatcher){
            let lastSig = '';
            window._generalCommentsWatcher = setInterval(()=>{
                try{
                    const gc = state.generalComments || {};
                    // חתימה: key:lengthFiltered
                    const sig = Object.keys(gc).sort().map(k=>{
                        const v = gc[k];
                        const len = Array.isArray(v)
                            ? v.filter(x=>x && String(x).trim()).length
                            : (v && String(v).trim() ? 1 : 0);
                        return k+':'+len;
                    }).join('|');
                    if (sig !== lastSig){
                        lastSig = sig;
                        if (typeof refreshAllMiniIndicators === 'function') refreshAllMiniIndicators();
                    }
                }catch{}
            }, 1500);
        }

        // חשיפה – אם מודולים אחרים רוצים לדרוש רענון מפורש
        window.forceCrawlingCommentsCountersRefresh = function(){
            refreshAllMiniIndicators();
        };

        // אפשר גם לחשוף החוצה לשימוש עתידי
        window.refreshAllMiniCommentIndicators = refreshAllMiniIndicators;
    };
})();