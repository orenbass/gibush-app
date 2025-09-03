(function () {
    window.Pages = window.Pages || {};
    window.Pages.renderStatusManagementPage = function renderStatusManagementPage() {
        headerTitle.textContent = 'סטטוס מועמדים';

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
                <div class="w-full grid grid-cols-2 gap-2">
                    <button 
                        class="status-btn w-full py-2 px-2 text-sm font-semibold rounded-lg
                               bg-amber-100/70 hover:bg-amber-200/70 border border-amber-300 text-amber-800
                               dark:bg-amber-900/20 dark:hover:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800
                               shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 transition-all"
                        data-shoulder-number="${runner.shoulderNumber}" 
                        data-status="temp_removed"
                        title="יצא לבדיקה">
                        <span class="ml-1">⚠️</span>
                        <span>בדיקה</span>
                    </button>
                    <button 
                        class="status-btn w-full py-2 px-2 text-sm font-semibold rounded-lg
                               bg-rose-100/70 hover:bg-rose-200/70 border border-rose-300 text-rose-800
                               dark:bg-rose-900/20 dark:hover:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800
                               shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-300/50 transition-all"
                        data-shoulder-number="${runner.shoulderNumber}" 
                        data-status="retired"
                        title="פרש">
                        <span class="ml-1">⛔</span>
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