(function () {
  window.Pages = window.Pages || {};

  window.Pages.renderSociometricStretcherHeatPage = function renderSociometricStretcherHeatPage(heatIndex) {
    const heat = state.sociometricStretcher?.heats?.[heatIndex];
    if (!heat) { contentDiv.innerHTML = '<p>מקצה לא נמצא.</p>'; return; }
    heat.selections = heat.selections || {};

    function ensureSelectionOrderBackfill(){
      if (!heat.selectionOrder) heat.selectionOrder = { stretcher: [], jerrican: [] };
      heat.selectionOrder.stretcher = heat.selectionOrder.stretcher || [];
      heat.selectionOrder.jerrican = heat.selectionOrder.jerrican || [];
      const sel = heat.selections;
      Object.entries(sel).forEach(([sn,type])=>{
        const arr = heat.selectionOrder[type];
        if (arr && !arr.includes(sn)) arr.push(sn);
      });
      ['stretcher','jerrican'].forEach(type=>{
        heat.selectionOrder[type] = heat.selectionOrder[type].filter(sn => sel[sn] === type);
      });
    }
    ensureSelectionOrderBackfill();

    const selections = heat.selections;

    const PAGE_LABEL = 'מקצה';
    if (window.headerTitle) {
      headerTitle.textContent = `${PAGE_LABEL} – מקצה ${heatIndex + 1}/${CONFIG.NUM_STRETCHER_HEATS}`;
    }

    const activeRunners = (state.runners || [])
      .filter(r => r.shoulderNumber && !state.crawlingDrills.runnerStatuses[r.shoulderNumber])
      .sort((a, b) => a.shoulderNumber - b.shoulderNumber);

    const stretcherCount = Object.values(selections).filter(v => v === 'stretcher').length;
    const jerricanCount  = Object.values(selections).filter(v => v === 'jerrican').length;
    const stretcherFull  = stretcherCount >= CONFIG.MAX_STRETCHER_CARRIERS;
    const jerricanFull   = jerricanCount  >= CONFIG.MAX_JERRICAN_CARRIERS;

    const runnerCardsHtml = activeRunners.map(r => {
      const sn = r.shoulderNumber;
      const sel = selections[sn];
      const isStretcher = sel === 'stretcher';
      const isJerrican  = sel === 'jerrican';
      const cardCls = ['runner-card'];
      if (isStretcher) cardCls.push('selected-stretcher');
      if (isJerrican) cardCls.push('selected-jerrican');

      const disableStretcher = !isStretcher && (isJerrican || stretcherFull);
      const disableJerrican  = !isJerrican && (isStretcher || jerricanFull);

      return `
        <div class="${cardCls.join(' ')}" data-sn="${sn}">
          <div class="runner-number">${sn}</div>
          <div class="task-row">
            <button
              data-shoulder-number="${sn}"
              data-type="stretcher"
              class="task-btn ${isStretcher ? 'active' : ''}"
              ${disableStretcher ? 'disabled' : ''}
              title="נשיאת אלונקה" aria-label="נשיאת אלונקה">
              ${window.Icons?.stretcher ? window.Icons.stretcher() : ''}
            </button>
            <button
              data-shoulder-number="${sn}"
              data-type="jerrican"
              class="task-btn ${isJerrican ? 'active' : ''}"
              ${disableJerrican ? 'disabled' : ''}
              title="נשיאת ג'ריקן" aria-label="נשיאת ג'ריקן">
              ${window.Icons?.jerrican ? window.Icons.jerrican() : ''}
            </button>
          </div>
        </div>`;
    }).join('');

    const topNavHtml = `
      <div id="stretcher-heat-nav" class="heat-nav">
        <button id="stretcher-heat-prev"
          class="nav-heat-btn"
          ${heatIndex === 0 ? 'disabled' : ''}>הקודם</button>
        <div class="heat-indicator">
          ${PAGE_LABEL} ${heatIndex + 1}/${CONFIG.NUM_STRETCHER_HEATS}
        </div>
        <button id="stretcher-heat-next"
          class="nav-heat-btn">
          ${heatIndex === CONFIG.NUM_STRETCHER_HEATS - 1 ? 'לדוחות' : 'הבא'}
        </button>
      </div>`;

    const instructionsHtml = `
      <div class="mb-3 text-center text-sm text-gray-600 dark:text-gray-300">
        בחר את נושאי האלונקה והג'ריקן. לחיצה חוזרת מבטלת, מעבר בין סוגים מחליף. הסיכום הדינמי למטה מציג את סדר הבחירה.
      </div>`;

    contentDiv.innerHTML = `
      ${topNavHtml}
      ${instructionsHtml}
      <div id="stretcher-grid" class="auto-grid stretcher-grid">
        ${runnerCardsHtml}
      </div>
      <div id="selection-summary" class="selection-summary-wrapper"></div>
    `;

    function updateSelectionSummary(){
      const wrap = document.getElementById('selection-summary');
      if(!wrap) return;
      ensureSelectionOrderBackfill();
      const orderSt = heat.selectionOrder.stretcher || [];
      const orderJe = heat.selectionOrder.jerrican || [];
      const lineHtml = (arr,label) => arr.length ? arr.map((sn,i)=>`<div class="summary-line"><span>${label} <strong>${i+1}</strong>:</span><span>מס' כתף <strong>${sn}</strong></span></div>`).join('') : '<div class="summary-line"><span>—</span></div>';
      wrap.innerHTML = `
        <div class="selection-summary-box">
          <h4>סיכום סדר בחירה (דינמי)</h4>
          <div class="summary-lines">
            <div style="font-weight:600;text-align:center;margin-bottom:4px">אלונקה</div>
            ${lineHtml(orderSt,'מקום')}
            <div style="font-weight:600;text-align:center;margin:8px 0 4px">ג'ריקן</div>
            ${lineHtml(orderJe,'מקום')}
          </div>
          <div class="summary-note">הסדר מתעדכן אוטומטית לפי סדר הלחיצות. הסרה תשמור על הרצף למעט הנמחק.</div>
        </div>`;
    }
    updateSelectionSummary();

    contentDiv.querySelector('#stretcher-grid')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.task-btn');
      if (!btn || btn.disabled) return;
      const sn = String(btn.dataset.shoulderNumber);
      const type = btn.dataset.type;
      const current = selections[sn];

      ensureSelectionOrderBackfill();

      if (current === type) {
        delete selections[sn];
        const arr = heat.selectionOrder[type];
        heat.selectionOrder[type] = arr.filter(x=>x!==sn);
      } else {
        if (current) {
          const oldArr = heat.selectionOrder[current];
          heat.selectionOrder[current] = oldArr.filter(x=>x!==sn);
        }
        selections[sn] = type;
        const arr = heat.selectionOrder[type];
        if (!arr.includes(sn)) arr.push(sn);
      }
      saveState();
      render();
      setTimeout(() => btn.blur(), 0);
    });

    document.getElementById('stretcher-heat-prev')?.addEventListener('click', () => {
      if (heatIndex > 0) {
        state.sociometricStretcher.currentHeatIndex = heatIndex - 1;
        saveState(); render();
      }
    });
    document.getElementById('stretcher-heat-next')?.addEventListener('click', () => {
      if (heatIndex < CONFIG.NUM_STRETCHER_HEATS - 1) {
        state.sociometricStretcher.currentHeatIndex = heatIndex + 1;
        saveState(); render();
      } else {
        state.currentPage = PAGES.REPORT;
        saveState(); render();
      }
    });
  };
})();