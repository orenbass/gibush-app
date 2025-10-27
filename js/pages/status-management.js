(function () {
    window.Pages = window.Pages || {};
    window.Pages.renderStatusManagementPage = function renderStatusManagementPage() {
        // REMOVED: הסרת יצירת <style> דינמי - כל הסגנונות עברו ל-css/pages/status-management.css

        const activeRunners = state.runners
            .filter(runner => runner.shoulderNumber && !state.crawlingDrills.runnerStatuses[runner.shoulderNumber])
            .sort((a, b) => a.shoulderNumber - b.shoulderNumber);

        const inactiveRunners = state.runners
            .filter(runner => runner.shoulderNumber && state.crawlingDrills.runnerStatuses[runner.shoulderNumber])
            .sort((a, b) => a.shoulderNumber - b.shoulderNumber);

        const activeCardsHtml = activeRunners.map(runner => {
            return `
            <div class="runner-card">
                <div>${runner.shoulderNumber}</div>
                <div class="status-actions-flex">
                    <button 
                        class="status-btn status-btn-square btn-temp-removed"
                        data-shoulder-number="${runner.shoulderNumber}" 
                        data-status="temp_removed"
                        title="יצא לבדיקה">
                        <span>⚠️</span>
                        <span>בדיקה</span>
                    </button>
                    <button 
                        class="status-btn status-btn-square btn-retired"
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
            const statusClass = isRetired ? 'status-retired' : 'status-temp-removed';
            const statusIcon = isRetired ? '⛔' : '⚠️';
            const statusText = isRetired ? 'פרש' : 'בדיקה';

            return `
            <div class="runner-card inactive ${statusClass}">
                <div>${runner.shoulderNumber}</div>
                <div>
                    <div>
                        <span>${statusIcon}</span>
                        <div>${statusText}</div>
                    </div>
                    <button 
                        class="status-btn"
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