(function () {
  window.Pages = window.Pages || {};
  window.Pages.renderAdminSettingsPage = function renderAdminSettingsPage() {
    const header = typeof headerTitle !== 'undefined' ? headerTitle : document.getElementById('header-title');
    if (header) header.textContent = 'הגדרות מנהל';

    const root = document.getElementById('content') || (typeof contentDiv !== 'undefined' ? contentDiv : null);
    if (!root) return;

    const originalSnapshot = JSON.parse(JSON.stringify(CONFIG));

    const fields = [
      { key: 'MAX_RUNNERS', label: 'כמות רצים מקסימלית', type: 'number', min: 1 },
      { key: 'NUM_HEATS', label: 'מספר מקצי ספרינטים', type: 'number', min: 1 },
      { key: 'MAX_CRAWLING_SPRINTS', label: 'מספר מקצי ספרינט זחילות', type: 'number', min: 0 },
      { key: 'NUM_STRETCHER_HEATS', label: 'מספר מקצי אלונקה/סחיבת איכר', type: 'number', min: 0 },
      { key: 'MAX_STRETCHER_CARRIERS', label: 'כמות נושאים מקסימלית (אלונקה/סחיבת איכר)', type: 'number', min: 0 },
      { key: 'MAX_JERRICAN_CARRIERS', label: 'כמות נושאי ג\'ריקן מקסימלית', type: 'number', min: 0 },
      { key: 'STRETCHER_PAGE_LABEL', label: 'שם התרגיל (לשונית)', type: 'text', placeholder: 'לדוגמה: סחיבת איכר' },
      { key: 'STRETCHER_CARRIER_NOUN_PLURAL', label: 'מלל לבחירה (לדוג\': "איכרים")', type: 'text', placeholder: 'יופיע במלל: בחר עד X ...' }
    ];

    const makeFieldRow = f => {
      const val = CONFIG[f.key] ?? '';
      return `
        <div class="space-y-1">
          <label class="block text-right text-sm font-medium" for="f-${f.key}">${f.label}</label>
          <div class="flex gap-2 items-start">
            <input
              id="f-${f.key}"
              data-key="${f.key}"
              type="${f.type}"
              ${f.min !== undefined ? `min="${f.min}"` : ''}
              class="flex-1 p-2 border rounded-lg text-right"
              value="${String(val).replace(/"/g,'&quot;')}"
              ${f.placeholder ? `placeholder="${f.placeholder}"` : ''}/>
            <button data-reset="${f.key}" class="text-xs px-2 py-1 border rounded hover:bg-gray-100">איפוס</button>
          </div>
          <p data-err="${f.key}" class="text-xs text-red-600 hidden"></p>
        </div>
      `;
    };

    root.innerHTML = `
      <div class="max-w-2xl mx-auto p-4 space-y-6" dir="rtl">
        <h2 class="text-2xl font-bold text-center">הגדרות גיבוש</h2>
        <div class="p-3 bg-yellow-100 border-r-4 border-yellow-500 text-yellow-800 text-sm rounded">
          <strong>אזהרה:</strong> שמירת ההגדרות תאפס את כל נתוני הגיבוש (רצים, מקצים, הערות וכו').
        </div>
        <form id="settings-form" class="space-y-5">
          ${fields.map(makeFieldRow).join('')}
        </form>
        <div class="flex flex-wrap gap-3 justify-center pt-2">
          <button id="btn-save" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-5 rounded disabled:opacity-40" disabled>שמור ואפס</button>
          <button id="btn-cancel" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-5 rounded disabled:opacity-40">ביטול</button>
          <button id="btn-defaults" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-5 rounded ${window.DefaultConfig ? '' : 'hidden'}">טעינת ברירת מחדל</button>
        </div>
        <div class="text-center">
          <span id="dirty-indicator" class="text-xs px-2 py-1 rounded bg-amber-200 text-amber-900 hidden">שינויים לא נשמרו</span>
        </div>
      </div>
    `;

    const form = root.querySelector('#settings-form');
    const saveBtn = root.querySelector('#btn-save');
    const cancelBtn = root.querySelector('#btn-cancel');
    const defaultsBtn = root.querySelector('#btn-defaults');
    const dirtyBadge = root.querySelector('#dirty-indicator');

    let dirty = false;
    let hasErrors = false;

    const markDirty = () => {
      dirty = true;
      dirtyBadge.classList.remove('hidden');
      saveBtn.disabled = hasErrors;
    };
    const markClean = () => {
      dirty = false;
      dirtyBadge.classList.add('hidden');
      saveBtn.disabled = true;
    };

    const validateField = (input) => {
      const key = input.dataset.key;
      const def = fields.find(f => f.key === key);
      const errEl = form.querySelector(`[data-err="${key}"]`);
      let error = '';
      if (def.type === 'number') {
        if (input.value.trim() === '') error = 'חייב להיות ערך מספרי';
        else if (isNaN(Number(input.value))) error = 'מספר לא תקין';
        else if (def.min !== undefined && Number(input.value) < def.min) error = `ערך מינימלי: ${def.min}`;
      } else if (def.type === 'text') {
        if (input.value.length > 60) error = 'ארוך מדי (מקס\' 60)';
      }
      if (error) {
        errEl.textContent = error;
        errEl.classList.remove('hidden');
        input.classList.add('border-red-500');
      } else {
        errEl.textContent = '';
        errEl.classList.add('hidden');
        input.classList.remove('border-red-500');
      }
      return !error;
    };

    const recomputeErrors = () => {
      hasErrors = false;
      form.querySelectorAll('input[data-key]').forEach(inp => {
        if (!validateField(inp)) hasErrors = true;
      });
      saveBtn.disabled = !dirty || hasErrors;
    };

    form.addEventListener('input', (e) => {
      const input = e.target.closest('input[data-key]');
      if (!input) return;
      validateField(input);
      const key = input.dataset.key;
      let newVal = input.value;
      const fMeta = fields.find(f => f.key === key);
      if (fMeta.type === 'number') newVal = newVal === '' ? '' : Number(newVal);
      if (newVal !== CONFIG[key]) markDirty();
      recomputeErrors();
    });

    form.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-reset]');
      if (!btn) return;
      e.preventDefault();
      const key = btn.dataset.reset;
      const input = form.querySelector(`input[data-key="${key}"]`);
      input.value = originalSnapshot[key];
      input.dispatchEvent(new Event('input'));
    });

    defaultsBtn && defaultsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!window.DefaultConfig) return;
      if (!confirm('לדרוס את הערכים הנוכחיים בערכי ברירת המחדל?')) return;
      fields.forEach(f => {
        if (window.DefaultConfig[f.key] !== undefined) {
          const inp = form.querySelector(`input[data-key="${f.key}"]`);
          inp.value = window.DefaultConfig[f.key];
          inp.dispatchEvent(new Event('input'));
        }
      });
    });

    const confirmAction = (title, msg, onOk) => {
      if (typeof showModal === 'function') {
        showModal(title, msg, onOk);
      } else {
        if (confirm(msg)) onOk();
      }
    };

    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (hasErrors) return;
      confirmAction(
        'אישור שינוי הגדרות',
        'פעולה זו תאפס את כל נתוני הגיבוש. להמשיך?',
        () => {
          // Commit values
            fields.forEach(f => {
              const inp = form.querySelector(`input[data-key="${f.key}"]`);
              if (f.type === 'number') {
                CONFIG[f.key] = Number(inp.value);
              } else {
                CONFIG[f.key] = inp.value.trim();
              }
            });
            // Reset application data
            if (typeof state !== 'undefined' && typeof PAGES !== 'undefined') {
              state.currentPage = PAGES.RUNNERS;
            }
            if (typeof initializeAllData === 'function') initializeAllData();
            if (typeof saveState === 'function') saveState();
            if (typeof render === 'function') render();
            if (typeof showModal === 'function') {
              showModal('הגדרות נשמרו', 'ההגדרות נשמרו וכל הנתונים אופסו.');
            } else {
              alert('ההגדרות נשמרו וכל הנתונים אופסו.');
            }
          markClean();
        }
      );
    });

    cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (dirty && !confirm('לבטל שינויים שלא נשמרו?')) return;
      if (typeof state !== 'undefined') {
        state.currentPage = state.lastPage || state.currentPage;
      }
      if (typeof render === 'function') render();
    });

    // Initial validation pass
    recomputeErrors();
    markClean();
  };
})();