(function () {
  window.Pages = window.Pages || {};

  function ensureCss() {
    if (document.getElementById('stretcher-heat-style')) return;
    const st = document.createElement('style');
    st.id = 'stretcher-heat-style';
    st.textContent = `
      .heat-nav{display:flex;align-items:center;justify-content:space-between;background:#e5e7eb;padding:8px 14px;border-radius:14px;margin-bottom:12px}
      .dark .heat-nav{background:#374151}
      .nav-heat-btn{background:#2563eb;color:#fff;font-weight:600;padding:8px 18px;border-radius:10px;font-size:14px;display:inline-flex;align-items:center;gap:6px;border:0;cursor:pointer;transition:.15s}
      .nav-heat-btn:hover{background:#1d4ed8}
      .nav-heat-btn:disabled{opacity:.4;cursor:not-allowed}
      .nav-heat-btn.bg-gray{background:#6b7280}
      .nav-heat-btn.bg-gray:hover{background:#4b5563}
      .auto-grid.stretcher-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(105px,1fr));gap:12px}
      @media (max-width:520px){.auto-grid.stretcher-grid{grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:10px}}
      .runner-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:8px 8px 10px;display:flex;flex-direction:column;align-items:center;gap:6px;min-height:118px;transition:.18s}
      .dark .runner-card{background:#1f2937;border-color:#334155}
      .runner-card.selected-stretcher{background:#d1fae5;border-color:#34d399}
      .dark .runner-card.selected-stretcher{background:#064e3b;border-color:#059669}
      .runner-card.selected-jerrican{background:#dbeafe;border-color:#60a5fa}
      .dark .runner-card.selected-jerrican{background:#1e3a8a;border-color:#3b82f6}
      .runner-number{font-size:24px;font-weight:700;color:#1e293b}
      .dark .runner-number{color:#f1f5f9}
      .task-row{display:flex;gap:6px;width:100%;justify-content:center;margin-top:auto}
      .task-btn{flex:1;display:inline-flex;align-items:center;justify-content:center;height:38px;border-radius:8px;font-size:20px;font-weight:600;border:1px solid #cbd5e1;background:#f1f5f9;color:#334155;cursor:pointer;transition:.15s;-webkit-tap-highlight-color:transparent}
      .task-btn:hover{background:#e2e8f0}
      .task-btn:focus{outline:none}
      .task-btn.active[data-type="stretcher"]{background:#059669;color:#fff;border-color:#047857}
      .task-btn.active[data-type="jerrican"]{background:#2563eb;color:#fff;border-color:#1d4ed8}
      .task-btn:disabled{opacity:.35;cursor:not-allowed}
      .dark .task-btn{background:#374151;border-color:#475569;color:#e2e8f0}
      .dark .task-btn:hover{background:#4b5563}
      .dark .task-btn.active[data-type="stretcher"]{background:#047857;border-color:#065f46}
      .dark .task-btn.active[data-type="jerrican"]{background:#1d4ed8;border-color:#1e40af}
      .st-selected-wrapper{margin-top:28px;display:grid;gap:16px}
      @media (min-width:700px){.st-selected-wrapper{grid-template-columns:1fr 1fr}}
      .st-panel{background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:14px}
      .dark .st-panel{background:#1f2937;border-color:#334155}
      .st-panel h3{margin:0 0 8px;font-size:15px;font-weight:700;color:#2563eb;display:flex;justify-content:space-between;align-items:center}
      .dark .st-panel h3{color:#3b82f6}
      .st-chips{display:flex;flex-wrap:wrap;gap:8px;min-height:34px}
      .chip{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:20px;font-size:13px;font-weight:600;background:#e0f2fe;color:#075985;border:1px solid #7dd3fc}
      .dark .chip{background:#1e3a8a;color:#bfdbfe;border-color:#1d4ed8}
      .chip[data-type="stretcher"]{background:#dcfce7;color:#065f46;border-color:#86efac}
      .dark .chip[data-type="stretcher"]{background:#065f46;color:#d1fae5;border-color:#047857}
      .chip[data-type="jerrican"]{background:#e0f2fe;color:#075985;border-color:#7dd3fc}
      .dark .chip[data-type="jerrican"]{background:#1e3a8a;color:#bfdbfe;border-color:#1d4ed8}
      .chip button{background:transparent;border:0;color:#dc2626;font-size:16px;line-height:1;cursor:pointer;padding:0 2px}
      .chip button:hover{color:#b91c1c}
      .dark .chip button{color:#f87171}
      .dark .chip button:hover{color:#ef4444}
      .chip-empty{opacity:.5;font-size:13px}
      .heat-nav .heat-indicator{font-size:18px;font-weight:700;color:#1e293b}
      .dark .heat-nav .heat-indicator{color:#f1f5f9}
      .task-btn svg{width:20px;height:20px;pointer-events:none;display:block}
      /* Jerrican water fill */
      .task-btn[data-type="jerrican"] svg .water{fill:#3b82f6;transition:.15s}
      .task-btn.active[data-type="jerrican"] svg .water{fill:#60a5fa}
      .dark .task-btn[data-type="jerrican"] svg .water{fill:#3b82f6}
      .dark .task-btn.active[data-type="jerrican"] svg .water{fill:#93c5fd}
    `;
    document.head.appendChild(st);
  }

  window.Pages.renderSociometricStretcherHeatPage = function renderSociometricStretcherHeatPage(heatIndex) {
    ensureCss();

    const heat = state.sociometricStretcher?.heats?.[heatIndex];
    if (!heat) { contentDiv.innerHTML = '<p>מקצה לא נמצא.</p>'; return; }
    heat.selections = heat.selections || {};
    const selections = heat.selections;

    const PAGE_LABEL = 'אלונקה סוציומטרית';
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

    const toList = (type) =>
      Object.entries(selections)
        .filter(([, v]) => v === type)
        .map(([sn]) => +sn)
        .sort((a, b) => a - b);

    const listStretcher = toList('stretcher');
    const listJerrican  = toList('jerrican');

    const mkChip = (sn, type) => `
      <span class="chip" data-type="${type}">
        <span>${sn}</span>
        <button type="button" data-remove-sn="${sn}" data-remove-type="${type}" aria-label="הסר ${sn}">×</button>
      </span>`;

    const bottomHtml = `
      <div class="st-selected-wrapper">
        <div class="st-panel">
          <h3>נושאי אלונקה <span>${listStretcher.length}/${CONFIG.MAX_STRETCHER_CARRIERS}</span></h3>
          <div id="stretcher-selected" class="st-chips">
            ${listStretcher.length ? listStretcher.map(sn => mkChip(sn, 'stretcher')).join('') : '<span class="chip-empty">—</span>'}
          </div>
        </div>
        <div class="st-panel">
          <h3>סוחבי ג'ריקן <span>${listJerrican.length}/${CONFIG.MAX_JERRICAN_CARRIERS}</span></h3>
          <div id="jerrican-selected" class="st-chips">
            ${listJerrican.length ? listJerrican.map(sn => mkChip(sn, 'jerrican')).join('') : '<span class="chip-empty">—</span>'}
          </div>
        </div>
      </div>`;

    contentDiv.innerHTML = `
      ${topNavHtml}
      <div id="stretcher-grid" class="auto-grid stretcher-grid">
        ${runnerCardsHtml}
      </div>
      ${bottomHtml}
    `;

    // כפתורי רץ
    contentDiv.querySelector('#stretcher-grid')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.task-btn');
      if (!btn || btn.disabled) return;
      const sn = +btn.dataset.shoulderNumber;
      const type = btn.dataset.type;

      // לוגיקה "כמו בספרינטים": לחיצה על אותו סוג שנבחר – ביטול; אחרת החלפה.
      const current = selections[sn];
      if (current === type) {
        delete selections[sn];
      } else {
        selections[sn] = type;
      }
      saveState();
      render();
      setTimeout(() => btn.blur(), 0);
    });

    // הסרת בחירה (X)
    contentDiv.querySelectorAll('[data-remove-sn]')?.forEach(x => {
      x.addEventListener('click', (e) => {
        const sn = +e.currentTarget.dataset.removeSn;
        if (selections[sn]) {
          delete selections[sn];
          saveState();
          render();
        }
      });
    });

    // ניווט
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