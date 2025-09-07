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
                .runner-sack-btn{position:relative;padding-left:38px;} /* מקום לאייקון החדש */
                .runner-sack-btn .comment-mini-indicator{
                  position:absolute;top:4px;left:4px;
                  width:30px;height:28px;
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
                  transform:translate(-50%,-62%); /* הרמנו עוד קצת (-60% היה קודם) */
                  font-size:11px;
                  pointer-events:none;
                  text-shadow:0 1px 2px rgba(0,0,0,.35);
                  color:#fff; /* תמיד לבן */
                }
                .runner-sack-btn .comment-mini-indicator.count-0 .cm-count{display:none;}
                .runner-sack-btn .comment-mini-indicator.count-0::after{
                  content:'+';position:absolute;
                  top:50%;left:50%;
                  transform:translate(-50%,-70%); /* היה -60% – הועלה מעט */
                  font-size:16px;font-weight:400;
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
    <span class="flex-1 text-center font-semibold text-xs md:text-sm">הערות</span>
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
          const raw = state.generalComments?.[sn];
          const arr = Array.isArray(raw) ? raw.filter(c=>c && c.trim()) :
                       (raw && String(raw).trim() ? [String(raw).trim()] : []);
          const has = arr.length > 0;
          const cCount = arr.length;
          const level = Math.min(cCount,5); // for color scale
          const summary = truncateCrawlCommentSummary(raw);
          return `<div class="bg-white p-3 rounded-lg shadow-sm flex items-center gap-2 dark:bg-slate-700">
              <span class="font-bold text-gray-700 dark:text-gray-100 text-sm md:text-base whitespace-nowrap" style="min-width:88px;text-align:right;">${i+1}. ${sn}</span>
              <span class="flex-1" style="min-width:0;">
                <button class="comment-btn sprint-comment-btn table-comment-btn comment-level-${level} ${has ? '' : 'comment-btn-empty'}"
                        data-comment-btn="${sn}"
                        title="עריכת הערות">
                  ${summary} ✎
                </button>
              </span>
              <span class="font-mono text-gray-600 dark:text-gray-200 text-sm md:text-base whitespace-nowrap"
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

        // הוספת ריענון גורף (קריאה חוזרת על כל הבועות המוצגות)
        function refreshAllMiniIndicators(){
            (displayedSackCarriers || []).forEach(r=>{
                if(r && r.shoulderNumber!=null) updateMiniCommentIndicator(r.shoulderNumber);
            });
        }

        // ריענון כאשר נלחץ כפתור שליחת "תגובה מהירה" (מהבר הגלובלי)
        document.addEventListener('click', e=>{
            if(e.target && e.target.id === 'quick-comment-send'){
                // השהייה קצרה כדי לאפשר ל-state להתעדכן ולהישמר
                setTimeout(refreshAllMiniIndicators, 120);
            }
        });

        // אפשר גם לחשוף החוצה לשימוש עתידי
        window.refreshAllMiniCommentIndicators = refreshAllMiniIndicators;
    };
})();