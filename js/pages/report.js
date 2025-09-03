(function () {
    window.Pages = window.Pages || {};
    window.Pages.renderReportPage = function renderReportPage() {
        headerTitle.textContent = 'דוח מסכם';
        state.manualScores = state.manualScores || {};
        state.isEditingScores = typeof state.isEditingScores === 'boolean' ? state.isEditingScores : false;

        const allRunners = state.runners.map(runner => {
            const status = state.crawlingDrills.runnerStatuses[runner.shoulderNumber] || 'פעיל';
            let sprintScore = '-', crawlingScore = '-', stretcherScore = '-';
            let totalScore = -1;
            if (status === 'פעיל') {
                sprintScore = calculateSprintFinalScore(runner);
                crawlingScore = calculateCrawlingFinalScore(runner);
                stretcherScore = calculateStretcherFinalScore(runner);
                totalScore = sprintScore + crawlingScore + stretcherScore;
            }
            return { shoulderNumber: runner.shoulderNumber, sprintScore, crawlingScore, stretcherScore, status, totalScore };
        });

        const activeRunners = allRunners.filter(r => r.status === 'פעיל').sort((a, b) => b.totalScore - a.totalScore);
        const inactiveRunners = allRunners.filter(r => r.status !== 'פעיל');

        const getRowClass = (index) => {
            if (index === 0) return 'highlight-gold';
            if (index === 1) return 'highlight-silver';
            if (index === 2) return 'highlight-bronze';
            return index % 2 === 0 ? 'bg-gray-50' : ' ';
        };

        let isApproved = state.scoresApproved || false;

        contentDiv.innerHTML = `
<div class="my-6 flex flex-wrap justify-center gap-4"></div>
<h2 class="text-xl font-semibold my-4 text-center">טבלת סיכום רצים פעילים (ערוך ציונים ידנית)</h2>
<div class="overflow-x-auto">
<table class="min-w-full bg-white border border-gray-300 text-sm">
    <thead class="bg-gray-200">
        <tr>
            <th class="py-2 px-2 border-b">דירוג</th>
            <th class="py-2 px-2 border-b">מס' כתף</th>
            <th class="py-2 px-2 border-b">סופי ספרינטים<br>(1-7)</th>
            <th class="py-2 px-2 border-b">סופי זחילות<br>(1-7)</th>
            <th class="py-2 px-2 border-b">סופי ${CONFIG.STRETCHER_PAGE_LABEL}<br>(1-7)</th>
            <th class="py-2 px-2 border-b">הערות כלליות</th>
        </tr>
    </thead>
    <tbody>
        ${activeRunners.map((runner, index) => {
            const scores = state.manualScores[runner.shoulderNumber] || {
                sprint: runner.sprintScore,
                crawl: runner.crawlingScore,
                stretcher: runner.stretcherScore
            };
            const generalComment = state.generalComments[runner.shoulderNumber] || '';
            return `
            <tr class="text-center ${getRowClass(index)}">
                <td>${index + 1}</td>
                <td>${runner.shoulderNumber}</td>
                <td>
                  <input type="number" min="1" max="7" value="${scores.sprint}" data-shoulder="${runner.shoulderNumber}" data-type="sprint" ${!state.isEditingScores ? 'disabled' : ''} style="width:55px; text-align:center;">
                  </td>
                <td>
                  <input type="number" min="1" max="7" value="${scores.crawl}" data-shoulder="${runner.shoulderNumber}" data-type="crawl" ${!state.isEditingScores ? 'disabled' : ''} style="width:55px; text-align:center;">
                </td>
                <td>
                  <input type="number" min="1" max="7" value="${scores.stretcher}" data-shoulder="${runner.shoulderNumber}" data-type="stretcher" ${!state.isEditingScores ? 'disabled' : ''} style="width:55px; text-align:center;">
                </td>
                <td>
                  <textarea data-shoulder="${runner.shoulderNumber}" data-type="generalComment" ${!state.isEditingScores ? 'disabled' : ''} style="width:150px; text-align:right; font-size: 0.8rem; padding: 2px;" rows="2">${generalComment}</textarea>
                </td>
            </tr>`;
        }).join('')}
    </tbody>
</table>
</div>
${inactiveRunners.length > 0 ? `
<h2 class="text-xl font-semibold my-4 text-center">מספרי כתף שאינם פעילים</h2>
<div class="overflow-x-auto">
<table class="min-w-full bg-white border border-gray-300 text-sm">
    <thead class="bg-gray-200">
        <tr>
            <th class="py-2 px-2 border-b">מס' כתף</th>
            <th class="py-2 px-2 border-b">סטטוס</th>
        </tr>
    </thead>
    <tbody>
        ${inactiveRunners.map((runner, index) => `
        <tr class="text-center ${index % 2 === 0 ? 'bg-gray-50' : ''}">
            <td class="py-2 px-2 border-b">${runner.shoulderNumber}</td>
            <td class="py-2 px-2 border-b">${runner.status === 'temp_removed' ? 'גריעה זמנית' : 'פרש'}</td>
        </tr>`).join('')}
    </tbody>
</table>
</div>` : ''}
<div class="mt-6 flex flex-row gap-4 justify-center">
  <button id="${state.isEditingScores ? 'save-scores-btn' : 'edit-scores-btn'}"
          class="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg">
      ${state.isEditingScores ? 'שמירה' : 'עריכה'}
  </button>
  ${state.isEditingScores ? `
  <button id="cancel-scores-btn" class="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg">
      ביטול
  </button>
  ` : ''}
  <button id="export-excel-btn"
        class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
        ${state.isEditingScores ? 'disabled style="opacity:0.5;pointer-events:none;"' : ''}>
    ייצא לאקסל
</button>
</div>
`;

        const exportBtn = document.getElementById('export-excel-btn');
        if (exportBtn) {
            exportBtn.disabled = state.isEditingScores;
            if (state.isEditingScores) {
                exportBtn.style.opacity = '0.5';
                exportBtn.style.pointerEvents = 'none';
            } else {
                exportBtn.style.opacity = '';
                exportBtn.style.pointerEvents = '';
            }
        }

        contentDiv.querySelectorAll('input[type="number"], textarea').forEach(input => {
            input.addEventListener('input', (e) => {
                if (!state.isEditingScores) return;
                const shoulder = e.target.dataset.shoulder;
                const type = e.target.dataset.type;

                const runnerData = allRunners.find(r => r.shoulderNumber == shoulder);
                if (!runnerData) return;

                if (!state.manualScores[shoulder]) {
                    state.manualScores[shoulder] = {
                        sprint: runnerData.sprintScore,
                        crawl: runnerData.crawlingScore,
                        stretcher: runnerData.stretcherScore
                    };
                }

                if (type === 'generalComment') {
                    state.generalComments[shoulder] = e.target.value;
                } else {
                    state.manualScores[shoulder][type] = parseInt(e.target.value) || 1;
                }
                saveState();
            });
        });

        document.getElementById('edit-scores-btn')?.addEventListener('click', () => {
            tempStateBackup = {
                manualScores: JSON.parse(JSON.stringify(state.manualScores || {})),
                generalComments: JSON.parse(JSON.stringify(state.generalComments || {}))
            };
            state.isEditingScores = true;
            render();
        });

        document.getElementById('save-scores-btn')?.addEventListener('click', () => {
            state.isEditingScores = false;
            tempStateBackup = null;
            saveState();
            render();
        });

        document.getElementById('cancel-scores-btn')?.addEventListener('click', () => {
            if (tempStateBackup) {
                state.manualScores = tempStateBackup.manualScores;
                state.generalComments = tempStateBackup.generalComments;
            }
            state.isEditingScores = false;
            tempStateBackup = null;
            render();
        });

        document.getElementById('export-excel-btn')?.addEventListener('click', exportToExcel);
    };
})();