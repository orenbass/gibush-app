(function () {
    window.Pages = window.Pages || {};
    window.Pages.renderStatusManagementPage = function renderStatusManagementPage() {
        // FIX: יצירת אלמנט <style> (היה חסר const st = ...)
        if (!document.getElementById('status-actions-flex-styles')) {
            const st = document.createElement('style');
            st.id = 'status-actions-flex-styles';
            st.textContent = `  
            /* הקארד: תיקון גובה – לא נעול כדי שהכפתור השב יופיע */
            .runner-card{
                width:110px !important;
                min-width:110px !important;
                max-width:110px !important;
                /* הסר height קבוע */
                min-height:90px !important;
                /* גובה דינמי לפי תוכן */
                height:auto !important;
                max-height:none !important;
                flex:0 0 110px;
                box-sizing:border-box;
                padding:8px !important;
            }
            /* קארד לא פעיל מקבל קצת יותר מקום */
            .runner-card.inactive{
                min-height:118px !important;
            }

            .status-actions-flex{
                display:flex;
                flex-wrap:nowrap;
                justify-content:space-around;
                align-items:center;
                gap:4px;
                width:90px;
                min-width:90px;
                margin:0 auto;
            }
            .status-actions-flex .status-btn-square{
                flex:0 0 40px;
                width:40px;
                height:40px;
                display:flex;
                flex-direction:column;
                align-items:center;
                justify-content:center;
                padding:2px;
                font-size:0.45rem;
                gap:1px;
                text-align:center;
                line-height:1;
                box-sizing:border-box;
                overflow:hidden;
                border-radius:8px;
            }
            .status-actions-flex .status-btn-square span:first-child{
                font-size:0.75rem;
                line-height:1;
            }
            .status-actions-flex .status-btn-square span:last-child{
                font-size:0.4rem;
                line-height:1;
                white-space:nowrap;
                overflow:hidden;
                text-overflow:ellipsis;
                max-width:100%;
            }

            /* כפתור השבה – ודא שלא נחתך */
            .runner-card .status-btn:not(.status-btn-square){
                padding:6px 8px !important;
                font-size:0.75rem !important;
                width:80% !important;
                min-height:34px !important;
                display:flex !important;
                align-items:center !important;
                justify-content:center !important;
                gap:6px !important;
                white-space:nowrap !important;
                border-radius:8px !important;
            }
            .runner-card button[data-status="active"]{
                background:rgba(16,185,129,0.12) !important;
                border:1px solid rgba(16,185,129,0.35) !important;
                color:rgb(5,150,105) !important;
                font-weight:600 !important;
                transition:.18s !important;
            }
            .runner-card button[data-status="active"]:hover{
                background:rgba(16,185,129,0.22) !important;
                border-color:rgba(16,185,129,0.55) !important;
                transform:translateY(-2px) !important;
            }

            .auto-grid.stretcher-grid{
                display:flex !important;
                flex-wrap:wrap !important;
                justify-content:center !important;
                gap:8px;
                width:100%;
                padding:0 4px;
            }
            @media (min-width:480px){
                .auto-grid.stretcher-grid{ gap:12px; }
            }
            @media (min-width:768px){
                .auto-grid.stretcher-grid{ gap:16px; }
            }
            `;
            document.head.appendChild(st);
        }

        const activeRunners = state.runners
            .filter(runner => runner.shoulderNumber && !state.crawlingDrills.runnerStatuses[runner.shoulderNumber])
            .sort((a, b) => a.shoulderNumber - b.shoulderNumber);

        const inactiveRunners = state.runners
            .filter(runner => runner.shoulderNumber && state.crawlingDrills.runnerStatuses[runner.shoulderNumber])
            .sort((a, b) => a.shoulderNumber - b.shoulderNumber);

        const activeCardsHtml = activeRunners.map(runner => {
            return `
            <div class="runner-card border rounded-xl shadow-sm hover:shadow-md p-3 flex flex-col items-center justify-between transition-all duration-300
                        bg-white/80 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60">
                <div class="text-xl font-bold text-gray-800 dark:text-gray-200 mb-1">${runner.shoulderNumber}</div>
                <div class="w-full status-actions-flex">
                    <button 
                        class="status-btn status-btn-square text-xs font-semibold rounded-lg
                               bg-amber-100/70 hover:bg-amber-200/70 border border-amber-300 text-amber-800
                               dark:bg-amber-900/20 dark:hover:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800
                               shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 transition-all"
                        data-shoulder-number="${runner.shoulderNumber}" 
                        data-status="temp_removed"
                        title="יצא לבדיקה">
                        <span>⚠️</span>
                        <span>בדיקה</span>
                    </button>
                    <button 
                        class="status-btn status-btn-square text-xs font-semibold rounded-lg
                               bg-rose-100/70 hover:bg-rose-200/70 border border-rose-300 text-rose-800
                               dark:bg-rose-900/20 dark:hover:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800
                               shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-300/50 transition-all"
                        data-shoulder-number="${runner.shoulderNumber}" 
                        data-status="retired"
                        title="פרש">
                        <span>⛔</span>
                        <span>פרש</span>
                    </button>
                </div>
            </div>`;
        }).join('');

        const inactiveCardsHtml = inactiveRunners.map(runner => {
            const status = state.crawlingDrills.runnerStatuses[runner.shoulderNumber];
            const isRetired = status === 'retired';
            const cardClass = isRetired
                ? 'bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-900/10 border-rose-200 dark:border-rose-700'
                : 'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10 border-amber-200 dark:border-amber-700';
            const statusIcon = isRetired ? '⛔' : '⚠️';
            const statusText = isRetired ? 'פרש' : 'בדיקה';

            return `
            <div class="runner-card inactive border rounded-xl shadow-sm p-3 flex flex-col items-center justify-between transition-colors duration-300 ${cardClass}">
                <div class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">${runner.shoulderNumber}</div>
                <div class="w-full flex flex-col items-center gap-1">
                    <div class="text-center py-0.5">
                        <span class="text-lg">${statusIcon}</span>
                        <div class="text-xs font-medium text-gray-700 dark:text-gray-300">${statusText}</div>
                    </div>
                    <button 
                        class="status-btn text-sm font-semibold rounded-lg
                               shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/50 transition-all
                               bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700
                               dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700" 
                        data-shoulder-number="${runner.shoulderNumber}" 
                        data-status="active"
                        title="השב לפעילות">
                        <span>✅</span>
                        <span>השב</span>
                    </button>
                </div>
            </div>`;
        }).join('');

        contentDiv.innerHTML = `
        <div class="space-y-6">
            ${activeRunners.length > 0 ? `
            <div>
                <h2 class="text-xl font-semibold mb-4 text-center text-emerald-600 dark:text-emerald-400">
                    מועמדים פעילים (${activeRunners.length})
                </h2>
                <div class="auto-grid stretcher-grid">
                    ${activeCardsHtml}
                </div>
            </div>
            ` : ''}
            
            ${inactiveRunners.length > 0 ? `
            <div>
                <h2 class="text-xl font-semibold mb-4 text-center text-slate-600 dark:text-slate-300">
                    מועמדים לא פעילים (${inactiveRunners.length})
                </h2>
                <div class="auto-grid stretcher-grid">
                    ${inactiveCardsHtml}
                </div>
            </div>
            ` : ''}

            ${activeRunners.length === 0 && inactiveRunners.length === 0 ? `
            <div class="text-center text-gray-500 dark:text-gray-400 py-8">
                <p class="text-lg mb-2">👥 אין מועמדים בקבוצה</p>
                <p>נדרש להוסיף מועמדים תחילה</p>
            </div>
            ` : ''}
        </div>`;

        document.querySelectorAll('.status-btn').forEach(btn => {
            btn.addEventListener('click', (e) => handleGlobalStatusChange(e, null));
        });
    };
})();