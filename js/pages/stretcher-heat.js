(function () {
  window.Pages = window.Pages || {};
  window.Pages.renderSociometricStretcherHeatPage = function renderSociometricStretcherHeatPage(heatIndex) {
      headerTitle.textContent = `${CONFIG.STRETCHER_PAGE_LABEL} - מקצה ${heatIndex + 1}`;

      const heat = state.sociometricStretcher.heats[heatIndex];
      if (!heat) { contentDiv.innerHTML = `<p>מקצה לא נמצא.</p>`; return; }

      heat.selections = heat.selections || {};

      const selections = heat.selections;
      const stretcherCount = Object.values(selections).filter(v => v === 'stretcher').length;
      const jerricanCount = Object.values(selections).filter(v => v === 'jerrican').length;
      const stretcherLimitReached = stretcherCount >= CONFIG.MAX_STRETCHER_CARRIERS;
      const jerricanLimitReached = jerricanCount >= CONFIG.MAX_JERRICAN_CARRIERS;

      const activeRunners = state.runners
          .filter(r => r.shoulderNumber && !state.crawlingDrills.runnerStatuses[r.shoulderNumber])
          .sort((a, b) => a.shoulderNumber - b.shoulderNumber);

      const runnerCardsHtml = activeRunners.map(runner => {
          const shoulderNumber = runner.shoulderNumber;
          const selection = heat.selections[shoulderNumber];

          const isStretcherSelected = selection === 'stretcher';
          const isJerricanSelected = selection === 'jerrican';

          const stretcherDisabled = isJerricanSelected || (!isStretcherSelected && stretcherLimitReached);
          const jerricanDisabled = isStretcherSelected || (!isJerricanSelected && jerricanLimitReached);

          return `
          <div class="runner-card border rounded-lg shadow-md p-3 flex flex-col items-center justify-between transition-colors duration-300 ${isStretcherSelected ? 'bg-green-100 dark:bg-green-900' : ''} ${isJerricanSelected ? 'bg-blue-100 dark:bg-blue-900' : ''}">
          <div class="text-3xl font-bold text-gray-800 dark:text-gray-200">${shoulderNumber}</div>
          <div class="task-row w-full mt-2">
              <button 
                  data-shoulder-number="${shoulderNumber}" 
                  data-type="stretcher"
                  class="task-btn p-2 rounded-lg text-2xl transition-all 
                         ${isStretcherSelected ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-600'}
                         ${stretcherDisabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-green-200 dark:hover:bg-green-700'}"
                  ${stretcherDisabled && !isStretcherSelected ? 'disabled' : ''}
                  title="נשיאת אלונקה">🚁</button>
              <button 
                  data-shoulder-number="${shoulderNumber}" 
                  data-type="jerrican"
                  class="task-btn p-2 rounded-lg text-2xl transition-all
                         ${isJerricanSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-600'}
                         ${jerricanDisabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-blue-200 dark:hover:bg-blue-700'}"
                  ${jerricanDisabled && !isJerricanSelected ? 'disabled' : ''}
                  title="נשיאת ג'ריקן">💧</button>
          </div>
      </div>`;
      }).join('');

      const navigationButtons = `
      <div class="flex justify-between items-center mt-6 p-2 bg-gray-200 dark:bg-gray-700 rounded-lg shadow-inner">
          <button id="prev-stretcher-heat-btn-inline" class="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg" ${heatIndex === 0 ? 'disabled' : ''}>הקודם</button>
          <span class="font-semibold text-gray-800 dark:text-gray-200">${CONFIG.STRETCHER_PAGE_LABEL} ${heatIndex + 1}/${CONFIG.NUM_STRETCHER_HEATS}</span>
          <button id="next-stretcher-heat-btn-inline" class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg">${heatIndex === CONFIG.NUM_STRETCHER_HEATS - 1 ? 'לדוחות' : 'הבא'}</button>
      </div>`;

      contentDiv.innerHTML = `
          <div id="stretcher-grid" class="auto-grid stretcher-grid">
              ${runnerCardsHtml}
          </div>
          ${navigationButtons}
      `;

      document.getElementById('stretcher-grid')?.addEventListener('click', (e) => {
          const btn = e.target.closest('.task-btn');
          if (!btn || btn.disabled) return;
          const shoulderNumber = parseInt(btn.dataset.shoulderNumber, 10);
          const type = btn.dataset.type;
          handleSociometricSelection(shoulderNumber, type, heatIndex);
      });

      document.getElementById('prev-stretcher-heat-btn-inline')?.addEventListener('click', () => {
          if (heatIndex > 0) {
              state.sociometricStretcher.currentHeatIndex--;
              saveState();
              render();
          }
      });
      document.getElementById('next-stretcher-heat-btn-inline')?.addEventListener('click', () => {
          if (heatIndex < CONFIG.NUM_STRETCHER_HEATS - 1) {
              state.sociometricStretcher.currentHeatIndex++;
              saveState();
              render();
          } else {
              state.currentPage = PAGES.REPORT;
              saveState();
              render();
          }
      });
  };
})();