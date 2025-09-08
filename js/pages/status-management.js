(function () {
    window.Pages = window.Pages || {};
    window.Pages.renderStatusManagementPage = function renderStatusManagementPage() {
        headerTitle.textContent = 'סטטוס מועמדים';

        // NEW: inject uniform square button flex layout (once)
        if (!document.getElementById('status-actions-flex-styles')) {
            const st = document.createElement('style');
            st.id = 'status-actions-flex-styles';
            st.textContent = `
            .status-actions-flex{
                display:flex;
                flex-wrap:nowrap;
                justify-content:center;
                gap:.40rem;
                min-width:108px;          /* בסיס מינימלי - לא יתכווץ מתחת */
                width:fit-content;
                margin:0 auto;
            }
            .status-actions-flex .status-btn-square{
                flex:0 0 48px;
                width:48px;
                height:48px;
                display:flex;
                flex-direction:column;
                align-items:center;
                justify-content:center;
                gap:.25rem;
                padding:.28rem .2rem;
                text-align:center;
                line-height:1.05;
                font-size:.55rem;
            }
            .status-actions-flex .status-btn-square span:first-child{
                font-size:.95rem;
                line-height:1;
            }
            /* Slight upscale on hover without affecting layout */
            .status-actions-flex .status-btn-square:hover{
                transform:translateY(-2px);
            }
            /* NEW: fixed size comment button matching square buttons */
            .comment-btn{
                display:inline-flex;
                align-items:center;
                justify-content:center;
                min-height:48px;
                min-width:84px;
                padding:0 12px;
                width:auto;
                flex:0 0 auto;
                box-sizing:border-box;
                white-space:nowrap;
                overflow:visible;
                border-radius:10px;
            }
            @media (min-width:480px){
                .status-actions-flex{
                    min-width:120px;
                }
                .status-actions-flex .status-btn-square{
                    flex:0 0 54px;
                    width:54px;
                    height:54px;
                    font-size:.6rem;
                }
                .status-actions-flex .status-btn-square span:first-child{
                    font-size:1.05rem;
                }
                .comment-btn{
                    min-height:54px;
                }
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
                <div class="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">${runner.shoulderNumber}</div>
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
            <div class="runner-card border rounded-xl shadow-sm p-3 flex flex-col items-center justify-between transition-colors duration-300 ${cardClass}">
                <div class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">${runner.shoulderNumber}</div>
                <div class="w-full flex flex-col items-center gap-2">
                    <div class="text-center py-1">
                        <span class="text-lg">${statusIcon}</span>
                        <div class="text-xs font-medium text-gray-700 dark:text-gray-300">${statusText}</div>
                    </div>
                    <button 
                        class="status-btn w-3/4 py-2 px-2 text-sm font-semibold rounded-lg
                               bg-emerald-100/70 hover:bg-emerald-200/70 border border-emerald-300 text-emerald-800
                               dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800
                               shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/50 transition-all" 
                        data-shoulder-number="${runner.shoulderNumber}" 
                        data-status="active"
                        title="השב לפעילות">
                        <span class="ml-1">✅</span>
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
