(function () {
    window.Pages = window.Pages || {};

    // פונקציה גלובלית לעדכון רשימת הפעילים בלבד
    window.updateActiveRunners = function updateActiveRunners() {
        const inactivePattern = /(retir|withdraw|dropped|drop\s*out|quit|inactive|not.?active|non.?active|eliminated|פרש|פרשה|פרישה|לא.?פעיל|עזב|עזבה|הוסר|הוסרה|נשר|נשרה|נשירה|לא\s*ממשיך|לא\s*משתתף|הודח|הודחה)/i;
        const runners = Array.isArray(window.state?.runners) ? window.state.runners : [];
        const runnerStatuses = state?.crawlingDrills?.runnerStatuses || {}; // NEW: מפה חיצונית

        const active = runners.filter(r => {
            if (!r) return false;
            const sn = r.shoulderNumber;
            if (sn == null || sn === '') return false;
            if (runnerStatuses[sn]) return false; // NEW: אם מסומן חיצונית כלא פעיל
            if (r.active === false || r.isActive === false) return false;
            if (r.inactive || r.notActive || r.retired || r.isRetired || r.withdrawn || r.withdrew ||
                r.dropped || r.droppedOut || r.quit || r.eliminated || r.removed || r.isRemoved ||
                r.hidden || r.disabled) return false;
            // טקסטים אפשריים
            const statusStr = [r.status, r.state, r.phase, r.reason, r.note, r.notes, r.comment, r.description, r.label]
                .filter(Boolean).join(' ');
            if (statusStr && inactivePattern.test(statusStr)) return false;
            return true;
        });
        // הסרת כפולים לפי מספר כתף
        const seen = new Set();
        window.state.activeRunners = active.filter(r => {
            const key = String(r.shoulderNumber).trim();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        window.state.activeShoulders = window.state.activeRunners.map(r => String(r.shoulderNumber).trim());
        // NEW: אירוע שינוי רשימת פעילים (רק אם השתנה)
        try {
            const prev = window.state.__lastActiveShoulders || [];
            const now = window.state.activeShoulders;
            if (JSON.stringify(prev) !== JSON.stringify(now)) {
                window.state.__lastActiveShoulders = [...now];
                window.dispatchEvent(new CustomEvent('activeRunnersChanged', { detail: { activeRunners: window.state.activeRunners, activeShoulders: now } }));
            }
        } catch (e) { /* silent */ }
    };

    // NEW: מצב עריכה אינלייני
    let runnerCardEdit = {
        active: false,
        original: null
    };

    // הוספת אזהרת יציאה ללא שמירה (רק פעם אחת)
    if (!window.__runnerCardEditUnloadGuard__) {
        window.__runnerCardEditUnloadGuard__ = true;
        window.addEventListener('beforeunload', (e) => {
            if (runnerCardEdit.active) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
        // UPDATED: allow internal edit actions (delete, inputs, save/cancel) without prompt
        document.addEventListener('click', (e) => {
            if (!runnerCardEdit.active) return;
            const actionable = e.target.closest('a, button, [data-page]');
            if (!actionable) return;

            // Allow any control inside edit scope (runner list or edit bar) or explicit allowed buttons
            if (
                actionable.id === 'save-inline-runners-btn' ||
                actionable.id === 'cancel-inline-runners-btn' ||
                actionable.id === 'edit-runners-btn' ||
                actionable.id === 'add-runner-inline-btn' ||  // ADDED: מתיר לחיצה על הוספת מועמד
                actionable.classList.contains('runner-delete-btn') ||
                actionable.closest('#runner-list') ||
                actionable.closest('#runner-inline-edit-bar')
            ) {
                return; // no navigation protection needed
            }

            // For navigation / outside actions
            if (!confirm('יש שינויים שלא נשמרו. לצאת בלי לשמור?')) {
                e.preventDefault();
                e.stopPropagation();
            } else {
                runnerCardEdit.active = false;
            }
        }, true);
    }

    // NEW: פונקציית שדרוג אינפוטים למקלדת מספרים + סינון
    function applyNumericEnhancements(root=document){
        const selector = 'input[data-shoulder-input], input.runner-inline-input, input[id*="group"], input[name*="group"], input[data-numeric]';
        root.querySelectorAll(selector).forEach(inp=>{
            if (inp.__numericEnhanced) return;
            inp.__numericEnhanced = true;
            inp.setAttribute('inputmode','numeric');
            inp.setAttribute('pattern','[0-9]*');
            inp.setAttribute('autocomplete','off');
            inp.setAttribute('enterkeyhint','done');
            // שימוש ב-tel מעלה הסתברות למקלדת מספרים במכשירים שונים
            if (inp.type !== 'number') inp.type = 'tel';
            inp.addEventListener('input',()=> {
                const v = inp.value;
                const digits = v.replace(/\D+/g,'');
                if (v !== digits) inp.value = digits;
            });
        });
    }

    // NEW: עטיפה להבטחת מקלדת מספרים רק עבור מספר קבוצה (גם בעריכת פרטים)
    if (!window.__groupNumberNumericPatch){
        window.__groupNumberNumericPatch = true;

        function enforceGroupNumberNumeric(){
            const selectors = [
                '#group-number-input',
                'input[name="groupNumber"]',
                'input[id*="group-number"]',
                'input[id*="groupNum"]',
                'input[name*="groupNum"]',
                'input[name*="group-number"]'
            ];
            selectors.forEach(sel=>{
                document.querySelectorAll(sel).forEach(inp=>{
                    inp.dataset.numeric = '1';   // כדי שייכלל בסלקטור המקורי
                });
            });
            applyNumericEnhancements(document);
        }

        // עטיפת המודאל אם קיים
        const originalShowEdit = window.showEditBasicDetailsModal;
        if (typeof originalShowEdit === 'function'){
            window.showEditBasicDetailsModal = function(){
                const r = originalShowEdit.apply(this, arguments);
                // ניסיונות מאוחרים כדי לוודא שה-DOM נטען
                requestAnimationFrame(()=>{
                    enforceGroupNumberNumeric();
                    setTimeout(enforceGroupNumberNumeric, 40);
                    setTimeout(enforceGroupNumberNumeric, 150);
                });
                return r;
            };
        }

        // גיבוי: לחיצה על כפתור "ערוך פרטים"
        document.addEventListener('click', e=>{
            if (e.target && e.target.id === 'edit-details-btn'){
                setTimeout(enforceGroupNumberNumeric, 30);
                setTimeout(enforceGroupNumberNumeric, 140);
            }
        });

        // גיבוי נוסף: בעת פתיחת המודאל הראשוני (כבר מטופל ע"י ה-MutationObserver, אך מחזקים)
        document.addEventListener('DOMContentLoaded', () => {
            enforceGroupNumberNumeric();
        });
    }

    // NEW: צופה לפתיחת מודאל ההגדרות הראשוני ומחיל מקלדת מספרים
    if (!window.__initModalNumericObserver){
        window.__initModalNumericObserver = true;
        const obs = new MutationObserver(muts=>{
            for (const m of muts){
                m.addedNodes.forEach(node=>{
                    if (!(node instanceof HTMLElement)) return;
                    // נזהה מודאל לפי מחלקה / id משוערים
                    if (node.id?.includes('initial') || node.classList.contains('modal') || node.querySelector('[data-initial-setup]')){
                        applyNumericEnhancements(node);
                    }
                    // גם אם נוספו אינפוטים בודדים
                    if (node.tagName === 'INPUT'){
                        applyNumericEnhancements(node.parentElement||document);
                    }
                });
            }
        });
        obs.observe(document.documentElement,{subtree:true, childList:true});
    }

    window.Pages.renderRunnersPage = function renderRunnersPage() {
        // REMOVED: מחיקת קביעת כותרת
        // headerTitle.textContent = 'ניהול קבוצה';

        // עדכון לפני רינדור (שיהיה זמין ל quick-comments)
        window.updateActiveRunners();

        // אם אין פרטי הערכה - הצג חלון התחלתי
        if (!state.evaluatorName || !state.groupNumber) {
            renderInitialSetupModal();
            return;
        }

        const todayDate = new Date().toLocaleDateString('he-IL');
        const currentTime = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

        const hasRunners = state.runners && state.runners.length > 0;

        contentDiv.innerHTML = `
<!-- פרטי הערכה (קומפקטי יותר) -->
<div class="evaluation-info relative max-w-md mx-auto mb-4 rounded-lg border border-blue-200/80 dark:border-blue-800/60
            bg-white text-gray-800 dark:bg-slate-900/55 p-3 shadow">
    <button id="edit-details-btn"
            class="absolute top-2 left-2 bg-gray-600/85 hover:bg-gray-700 text-white font-medium py-0.5 px-2.5 rounded text-[0.65rem] shadow-sm">
        ערוך
    </button>
    <h2 class="text-center text-base md:text-lg font-bold text-gray-800 dark:text-blue-300 mb-2 leading-snug">
        פרטי הערכה
    </h2>
    <div class="flex items-stretch justify-center gap-4 mb-2">
        <div class="flex flex-col items-center leading-tight">
            <span class="text-[0.55rem] tracking-wide text-gray-500 dark:text-gray-400">שם המעריך</span>
            <span class="mt-1 inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-gray-800 text-sm md:text-base font-extrabold
                         dark:bg-blue-900/40 dark:text-blue-200">
                ${state.evaluatorName}
            </span>
        </div>
        <div class="w-px bg-blue-200 dark:bg-blue-800/50 mx-1"></div>
        <div class="flex flex-col items-center leading-tight">
            <span class="text-[0.55rem] tracking-wide text-gray-500 dark:text-gray-400">מספר קבוצה</span>
            <span class="mt-1 inline-flex items-center px-2 py-1 rounded-md bg-indigo-100 text-gray-800 text-sm md:text-base font-extrabold
                         dark:bg-indigo-900/40 dark:text-indigo-200">
                ${state.groupNumber}
            </span>
        </div>
    </div>
    <div class="flex items-center justify-between text-[0.58rem] md:text-[0.65rem] font-medium text-gray-600 dark:text-gray-400 pt-1 border-t border-blue-100 dark:border-slate-700">
        <span class="flex items-center gap-1"><span class="opacity-70">תאריך</span>${todayDate}</span>
        <span class="flex items-center gap-1"><span class="opacity-70">שעה</span>${currentTime}</span>
    </div>
</div>

${!hasRunners ? `
    <!-- כפתור הוספת מועמדים - רק כשאין מועמדים -->
    <div class="mb-4 text-center">
        <button id="add-runners-btn" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-md">
            הוסף מועמדים לקבוצה
        </button>
    </div>
` : ''}

${hasRunners ? `
    <!-- רשימת מועמדים קיימים עם כפתור עריכה -->
    <div class="relative mb-6">
        <h2 class="text-xl font-semibold mb-4 text-center text-blue-500">מועמדי הקבוצה (${state.runners.length})</h2>
        <div class="mb-2 text-center relative">
            <span class="text-lg font-semibold text-gray-700 dark:text-gray-300">מספרי כתף</span>
            <!-- כפתור עריכת מועמדים בצד שמאל למעלה -->
            <button id="edit-runners-btn" class="absolute top-0 left-0 bg-orange-500 hover:bg-orange-600 text-white font-bold py-1 px-3 rounded-lg text-sm">
                ערוך מועמדים
            </button>
        </div>
        <div id="runner-list" class="space-y-2"></div>
        
        <!-- כפתור הוספת מועמד במצב עריכה - יוצג במקום כפתור התחל מקצים -->
        <div class="flex justify-center mt-6">
            <button id="add-runner-inline-btn" class="bg-green-600 hover:bg-green-700 text-white text-xl font-bold py-3 px-6 rounded-lg shadow-lg w-full" style="display: none;">
                + הוסף מועמד
            </button>
        </div>
    </div>
    
    <!-- כפתור התחלת מקצים -->
    <div class="flex justify-center mt-6">
        <button id="start-heats-btn" class="bg-green-600 hover:bg-green-700 text-white text-xl font-bold py-3 px-6 rounded-lg shadow-lg w-full">
            התחל מקצים
        </button>
    </div>
` : `
    <div class="text-center text-gray-500 dark:text-gray-400 py-8">
        <p class="text-lg mb-2">🏃‍♂️ אין עדיין מועמדים בקבוצה</p>
        <p>לחץ על "הוסף מועמדים לקבוצה" כדי להתחיל</p>
    </div>
`}

<div id="runner-error" class="mt-4 text-red-500 text-center font-bold hidden"></div>

<!-- ניהול נתונים -->
<div class="mt-8 border-t pt-4 border-gray-300 dark:border-gray-600">
    <h3 class="text-lg font-semibold mb-3 text-center text-gray-700 dark:text-gray-300">ניהול נתונים</h3>
    <div class="flex justify-center gap-4 flex-wrap">
        <button id="admin-settings-btn" class="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-lg text-sm">הגדרות מנהל</button>
        <button id="export-backup-btn" class="bg-blue-800 hover:bg-blue-900 text-white font-bold py-2 px-4 rounded-lg text-sm">ייצא גיבוי (JSON)</button>
        <input type="file" id="import-backup-input" class="hidden" accept=".json">
        <button id="import-backup-btn" class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg text-sm">ייבא גיבוי (JSON)</button>
        <button id="reset-app-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg text-sm">אפס אפליקציה</button>
    </div>
</div>`;

        // רענון סרגל הערות מהירות לאחר חישוב פעילים
        if (window.QuickComments?.renderBar && document.getElementById('quick-comment-bar-container')) {
            window.QuickComments.renderBar(true);
        }

        // רינדור ריבועי מתמודדים (עיצוב כמו עמוד סטטוס)
        if (state.runners && state.runners.length > 0) {
            const runnerListEl = document.getElementById('runner-list');
            if (runnerListEl) {
                const runnerStatuses = state?.crawlingDrills?.runnerStatuses || {};
                const sorted = [...state.runners]
                    .filter(r => r && r.shoulderNumber !== undefined && r.shoulderNumber !== null && String(r.shoulderNumber).trim() !== '')
                    .sort((a, b) => Number(a.shoulderNumber) - Number(b.shoulderNumber));

                const cardsHtml = sorted.map(r => {
                    const sn = r.shoulderNumber;
                    const status = runnerStatuses[sn]; // 'temp_removed' | 'retired' | undefined
                    let cardClass, statusBadge = '';

                    if (status === 'retired') {
                        cardClass = 'bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-900/10 border-rose-200 dark:border-rose-700';
                        statusBadge = `<div class="mt-1 text-[0.6rem] font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1"><span>⛔</span><span>פרש</span></div>`;
                    } else if (status === 'temp_removed') {
                        cardClass = 'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10 border-amber-200 dark:border-amber-700';
                        statusBadge = `<div class="mt-1 text-[0.6rem] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1"><span>⚠️</span><span>בדיקה</span></div>`;
                    } else {
                        cardClass = 'bg-white/80 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60';
                        statusBadge = `<div class="mt-1 text-[0.55rem] font-medium text-emerald-600 dark:text-emerald-400 tracking-wide">פעיל</div>`;
                    }

                    return `
                    <div class="runner-card border rounded-xl shadow-sm hover:shadow-md p-3 flex flex-col items-center justify-center transition-all duration-300 ${cardClass}">
                        <div class="text-xl font-bold text-gray-800 dark:text-gray-100 leading-none">${sn}</div>
                        ${statusBadge}
                    </div>`;
                }).join('');

                runnerListEl.innerHTML = `
                    <div class="auto-grid stretcher-grid">
                        ${cardsHtml}
                    </div>`;
            }
        }

        // לאחר יצירת הגריד נוסיף סרגל עריכה (אם יש רצים)
        if (state.runners && state.runners.length > 0) {
            const runnerListEl = document.getElementById('runner-list');
            if (runnerListEl && !document.getElementById('runner-inline-edit-bar')) {
                runnerListEl.insertAdjacentHTML('beforebegin', `
                    <div id="runner-inline-edit-bar" class="hidden flex justify-center gap-3 mb-3">
                        <button id="save-inline-runners-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-5 rounded-lg text-sm">
                            שמור שינויים
                        </button>
                        <button id="cancel-inline-runners-btn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-5 rounded-lg text-sm">
                            בטל
                        </button>
                    </div>
                    <div id="runner-inline-edit-error" class="hidden text-center text-red-600 font-semibold text-sm mb-2"></div>
                `);
            }
        }

        // --- פונקציות מצב עריכה אינלייני ---
        function enterInlineEditMode() {
            if (runnerCardEdit.active) return;
            const grid = document.querySelector('#runner-list .auto-grid');
            if (!grid) return;
            runnerCardEdit.original = JSON.parse(JSON.stringify(state.runners || []));
            runnerCardEdit.active = true;

            document.getElementById('runner-inline-edit-bar')?.classList.remove('hidden');
            const editBtn = document.getElementById('edit-runners-btn');
            if (editBtn) {
                editBtn.disabled = true;
                editBtn.classList.add('opacity-60', 'cursor-not-allowed');
            }

            // UPDATED: החלפת כפתור התחל מקצים בכפתור הוסף מועמד
            const startHeatsBtn = document.getElementById('start-heats-btn');
            if (startHeatsBtn) {
                startHeatsBtn.style.display = 'none';
            }
            
            const addRunnerBtn = document.getElementById('add-runner-inline-btn');
            if (addRunnerBtn) {
                addRunnerBtn.style.display = 'inline-block';
            }

            grid.querySelectorAll('.runner-card').forEach(card => {
                const numEl = card.querySelector('.text-xl');
                if (!numEl) return;
                const current = numEl.textContent.trim();
                // שמירת גודל/עיצוב: מחליף תוכן למכולה עם אינפוט שקוף רקע
                numEl.innerHTML = `
                    <input data-shoulder-input
                           type="tel"
                           inputmode="numeric"
                           pattern="[0-9]*"
                           autocomplete="off"
                           enterkeyhint="done"
                           class="runner-inline-input w-16 text-center font-bold text-gray-800 dark:text-gray-100 bg-transparent border border-gray-300 dark:border-gray-600 rounded-md text-base py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                           value="${current}" data-original="${current}" />
                `;
                // כפתור מחיקה מוצמד
                if (!card.querySelector('.runner-delete-btn')) {
                    card.insertAdjacentHTML('beforeend', `
                        <button type="button" class="runner-delete-btn mt-2 text-[0.60rem] font-semibold px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-md shadow focus:outline-none focus:ring-2 focus:ring-rose-300">
                            מחק
                        </button>
                    `);
                }
            });
            // NEW: החלת מקלדת מספרים על האינפוטים החדשים
            applyNumericEnhancements(grid);
        }

        function exitInlineEditMode(save) {
            const errorEl = document.getElementById('runner-inline-edit-error');
            if (save) {
                const inputs = Array.from(document.querySelectorAll('.runner-inline-input'));
                let values = inputs.map(i => i.value.trim()).filter(v => v !== '');
                const duplicates = values.filter((v, i) => values.indexOf(v) !== i);
                if (values.length === 0) { showError('נדרש לפחות מספר אחד'); return; }
                if (duplicates.length) { showError('יש כפילויות: ' + [...new Set(duplicates)].join(', ')); return; }
                const mapped = inputs.map((input) => {
                    const originalObj = (runnerCardEdit.original || []).find(r => String(r.shoulderNumber) === input.dataset.original);
                    if (originalObj) return { ...originalObj, shoulderNumber: input.value.trim() };
                    return { shoulderNumber: input.value.trim() };
                });
                // NEW: זיהוי מחוקים
                const originalSet = new Set((runnerCardEdit.original || []).map(r => String(r.shoulderNumber)));
                const newSet = new Set(mapped.map(r => String(r.shoulderNumber)));
                const removed = [...originalSet].filter(x => !newSet.has(x));
                // --- migrate changed numbers (קיים בקוד המקורי - שמור) ---
                (function migrateShoulderKeyedData() {
                    const oldNums = inputs.map(i => i.dataset.original);
                    const newNums = inputs.map(i => i.value.trim());
                    let hasChange = false; const mapChanges = {};
                    for (let i = 0; i < oldNums.length; i++) { const o = oldNums[i]; const n = newNums[i]; if (o && n && o !== n) { hasChange = true; mapChanges[o] = n; } }
                    if (!hasChange) return;
                    function remapObject(obj) { if (!obj || typeof obj !== 'object') return obj; const out = {}; Object.keys(obj).forEach(k => { const newK = mapChanges[k] || k; out[newK] = obj[k]; }); return out; }
                    if (state.generalComments) state.generalComments = remapObject(state.generalComments);
                    if (state.manualScores) state.manualScores = remapObject(state.manualScores);
                    if (state.quickComments) state.quickComments = remapObject(state.quickComments);
                    if (state.crawlingDrills && state.crawlingDrills.runnerStatuses) state.crawlingDrills.runnerStatuses = remapObject(state.crawlingDrills.runnerStatuses);
                })();
                // NEW: ניקוי נתונים של רצים שנמחקו
                (function cleanupRemoved() {
                    if (!removed.length) return;
                    const remSet = new Set(removed);
                    function pruneKeys(obj) { if (!obj) return; for (const k of [...Object.keys(obj)]) { if (remSet.has(k)) delete obj[k]; } }
                    pruneKeys(state.generalComments);
                    pruneKeys(state.manualScores);
                    pruneKeys(state.quickComments);
                    if (state.crawlingDrills && state.crawlingDrills.runnerStatuses) pruneKeys(state.crawlingDrills.runnerStatuses);
                    // גיבוי: אם יש מערך heats בפורמט של אובייקטים המכילים runners/participants
                    if (Array.isArray(state.heats)) {
                        state.heats.forEach(h => {
                            if (Array.isArray(h.runners)) h.runners = h.runners.filter(sn => !remSet.has(String(sn)));
                            if (Array.isArray(h.participants)) h.participants = h.participants.filter(sn => !remSet.has(String(sn)));
                        });
                    }
                    // עמודים אחרים (דוגמא כללית):
                    if (state.crawlingDrills && Array.isArray(state.crawlingDrills.results)) {
                        state.crawlingDrills.results = state.crawlingDrills.results.filter(r => !remSet.has(String(r.shoulderNumber)));
                    }
                })();
                state.runners = mapped;
                saveState?.();
                window.updateActiveRunners();
                
                // ADDED: רענון עמודים קשורים אחרי שמירה
                refreshRelatedPages();
                
                try { window.dispatchEvent(new CustomEvent('runnersChanged', { detail: { runners: state.runners.map(r => ({ ...r })) } })); } catch (e) { /* silent */ }
            } else {
                if (runnerCardEdit.original) { state.runners = JSON.parse(JSON.stringify(runnerCardEdit.original)); }
            }
            if (errorEl) { errorEl.classList.add('hidden'); errorEl.textContent = ''; }
            runnerCardEdit.active = false;
            runnerCardEdit.original = null;

            // UPDATED: החזרת כפתור התחל מקצים והסתרת כפתור הוסף מועמד
            const startHeatsBtn = document.getElementById('start-heats-btn');
            if (startHeatsBtn) {
                startHeatsBtn.style.display = 'flex';
            }
            
            const addRunnerBtn = document.getElementById('add-runner-inline-btn');
            if (addRunnerBtn) {
                addRunnerBtn.style.display = 'none';
            }

            render();
        }

        function showError(msg) {
            const errorEl = document.getElementById('runner-inline-edit-error');
            if (!errorEl) return;
            errorEl.textContent = msg;
            errorEl.classList.remove('hidden');
        }

        // --- מאזינים ---

        // החלפת מאזין כפתור עריכה למצב אינלייני
        const editBtn = document.getElementById('edit-runners-btn');
        if (editBtn) {
            editBtn.removeEventListener('click', showRunnerEditMode); // אם היה קיים
            editBtn.addEventListener('click', enterInlineEditMode);
        }

        // ADDED: מאזין לכפתור הוספת מתמודד במצב עריכה
        document.getElementById('add-runner-inline-btn')?.addEventListener('click', () => {
            if (!runnerCardEdit.active) return;
            
            const grid = document.querySelector('#runner-list .auto-grid');
            if (!grid) return;
            
            // יצירת כרטיס חדש עם אינפוט ריק
            const newCard = document.createElement('div');
            newCard.className = 'runner-card border rounded-xl shadow-sm hover:shadow-md p-3 flex flex-col items-center justify-center transition-all duration-300 bg-white/80 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60';
            newCard.innerHTML = `
                <div class="text-xl font-bold text-gray-800 dark:text-gray-100 leading-none">
                    <input data-shoulder-input
                           type="tel"
                           inputmode="numeric"
                           pattern="[0-9]*"
                           autocomplete="off"
                           enterkeyhint="done"
                           class="runner-inline-input w-16 text-center font-bold text-gray-800 dark:text-gray-100 bg-transparent border border-gray-300 dark:border-gray-600 rounded-md text-base py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                           value="" data-original="" placeholder="מספר" />
                </div>
                <div class="mt-1 text-[0.55rem] font-medium text-emerald-600 dark:text-emerald-400 tracking-wide">חדש</div>
                <button type="button" class="runner-delete-btn mt-2 text-[0.60rem] font-semibold px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-md shadow focus:outline-none focus:ring-2 focus:ring-rose-300">
                    מחק
                </button>
            `;
            
            grid.appendChild(newCard);
            
            // החלת מקלדת מספרים על האינפוט החדש
            applyNumericEnhancements(newCard);
            
            // פוקוס על האינפוט החדש
            const input = newCard.querySelector('.runner-inline-input');
            if (input) {
                input.focus();
            }
        });

        document.getElementById('save-inline-runners-btn')?.addEventListener('click', () => exitInlineEditMode(true));
        document.getElementById('cancel-inline-runners-btn')?.addEventListener('click', () => {
            if (!confirm('לבטל שינויים?')) return;
            exitInlineEditMode(false);
        });

        // מחיקת מתמודד (delegation אחרי כניסה לעריכה) - UPDATED הסרת חלון אישור
        document.getElementById('runner-list')?.addEventListener('click', (e) => {
            if (!runnerCardEdit.active) return;
            const delBtn = e.target.closest('.runner-delete-btn');
            if (!delBtn) return;
            const card = delBtn.closest('.runner-card');
            const input = card?.querySelector('.runner-inline-input');
            if (input) {
                card.remove(); // הסרה ויזואלית מיידית (דורש שמירה לאישור סופי)
            }
        });

        // --- מאזינים קיימים (התאמות) ---
        document.getElementById('add-runners-btn')?.addEventListener('click', showAddRunnersModal);
        document.getElementById('edit-details-btn')?.addEventListener('click', showEditBasicDetailsModal);
        // *** הוסר: showRunnerEditMode (עכשיו עריכה אינליינית) ***
        document.getElementById('start-heats-btn')?.addEventListener('click', () => {
            if (runnerCardEdit.active && !confirm('יש שינויים שלא נשמרו. להמשיך בלי לשמור?')) return;
            validateAndStartHeats();
        });
        document.getElementById('admin-settings-btn')?.addEventListener('click', handleAdminSettingsClick);
        document.getElementById('reset-app-btn')?.addEventListener('click', () => {
            if (runnerCardEdit.active && !confirm('יש שינויים שלא נשמרו. להמשיך בלי לשמור?')) return;
            showModal('איפוס אפליקציה', 'האם אתה בטוח? כל הנתונים יימחקו לצמיתות.', () => {
                localStorage.removeItem(CONFIG.APP_STATE_KEY);
                CONFIG = { NUM_HEATS: 14, MAX_CRAWLING_SPRINTS: 4, MAX_RUNNERS: 20, MAX_SACK_CARRIERS: 3, NUM_STRETCHER_HEATS: 8, MAX_STRETCHER_CARRIERS: 4, MAX_JERRICAN_CARRIERS: 3, STRETCHER_PAGE_LABEL: 'אלונקות', STRETCHER_CARRIER_NOUN_PLURAL: 'רצים שלקחו אלונקה', APP_STATE_KEY: 'sprintAppState_v1.11' };
                state.currentPage = PAGES.RUNNERS;
                initializeAllData();
                saveState();
                render();
            });
        });
        document.getElementById('export-backup-btn')?.addEventListener('click', () => {
            if (runnerCardEdit.active && !confirm('יש שינויים שלא נשמרו. לייצא בכל זאת?')) return;
            exportBackup();
        });
        document.getElementById('import-backup-btn')?.addEventListener('click', () => {
            if (runnerCardEdit.active && !confirm('יש שינויים שלא נשמרו. להמשיך בלי לשמור?')) return;
            document.getElementById('import-backup-input').click();
        });
        document.getElementById('import-backup-input')?.addEventListener('change', importBackup);

        // לאחר רינדור ראשוני – החלה גם אם יש אינפוטים קיימים (למקרה של מודאל פתוח מראש)
        applyNumericEnhancements();

        // ADDED: טיפול ברענון עמודים אחרים כשמעדכנים רץ (כמו שעשינו בספרינטים)
        function refreshRelatedPages() {
            // רענון עמוד זחילה קבוצתית
            if (typeof window.Pages?.renderCrawlingDrillsCommentsPage === 'function') {
                setTimeout(() => {
                    if (state.currentPage === PAGES.CRAWLING_COMMENTS) {
                        window.Pages.renderCrawlingDrillsCommentsPage();
                    }
                }, 100);
            }
            
            // שליחת אירועים לעמודים אחרים
            window.dispatchEvent(new CustomEvent('runnerUpdated', { 
                detail: { timestamp: Date.now() } 
            }));
            window.dispatchEvent(new CustomEvent('runnersChanged', { 
                detail: { timestamp: Date.now() } 
            }));
        }
    };
})();