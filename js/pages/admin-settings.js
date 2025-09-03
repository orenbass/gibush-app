(function () {
    window.Pages = window.Pages || {};
    window.Pages.renderAdminSettingsPage = function renderAdminSettingsPage() {
        headerTitle.textContent = 'הגדרות מנהל';

        contentDiv.innerHTML = `
    <h2 class="text-xl font-semibold mb-4 text-center text-blue-500">הגדרות גיבוש</h2>
    <div class="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg shadow-inner max-w-lg mx-auto">
        <div class="text-center p-2 bg-yellow-100 border-r-4 border-yellow-500 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-600">
            <p><strong>אזהרה:</strong> שינוי הגדרות אלה יאפס את כל נתוני המקצים וההתקדמות. יש לבצע זאת רק לפני תחילת הגיבוש.</p>
        </div>
        <div>
            <label for="setting-max-runners" class="block text-right mb-1 text-sm font-medium">כמות רצים מקסימלית</label>
            <input type="number" id="setting-max-runners" value="${CONFIG.MAX_RUNNERS}" class="w-full p-2 border border-gray-300 rounded-lg text-lg text-right">
        </div>
        <div>
            <label for="setting-num-heats" class="block text-right mb-1 text-sm font-medium">מספר מקצי ספרינטים</label>
            <input type="number" id="setting-num-heats" value="${CONFIG.NUM_HEATS}" class="w-full p-2 border border-gray-300 rounded-lg text-lg text-right">
        </div>
        <div>
            <label for="setting-crawling-sprints" class="block text-right mb-1 text-sm font-medium">מספר מקצי ספרינט זחילות</label>
            <input type="number" id="setting-crawling-sprints" value="${CONFIG.MAX_CRAWLING_SPRINTS}" class="w-full p-2 border border-gray-300 rounded-lg text-lg text-right">
        </div>
        <div>
            <label for="setting-stretcher-heats" class="block text-right mb-1 text-sm font-medium">מספר מקצי אלונקה/סחיבת איכר</label>
            <input type="number" id="setting-stretcher-heats" value="${CONFIG.NUM_STRETCHER_HEATS}" class="w-full p-2 border border-gray-300 rounded-lg text-lg text-right">
        </div>
        <div>
            <label for="setting-max-stretcher-carriers" class="block text-right mb-1 text-sm font-medium">כמות נושאים מקסימלית (אלונקה/סחיבת איכר)</label>
            <input type="number" id="setting-max-stretcher-carriers" value="${CONFIG.MAX_STRETCHER_CARRIERS}" class="w-full p-2 border border-gray-300 rounded-lg text-lg text-right">
        </div>
        <div>
            <label for="setting-max-jerrican-carriers" class="block text-right mb-1 text-sm font-medium">כמות נושאי ג'ריקן מקסימלית</label>
            <input type="number" id="setting-max-jerrican-carriers" value="${CONFIG.MAX_JERRICAN_CARRIERS}" class="w-full p-2 border border-gray-300 rounded-lg text-lg text-right">
        </div>
        <div>
            <label for="setting-stretcher-page-label" class="block text-right mb-1 text-sm font-medium">שם התרגיל (יופיע בלשונית)</label>
            <input type="text" id="setting-stretcher-page-label" value="${CONFIG.STRETCHER_PAGE_LABEL}" class="w-full p-2 border border-gray-300 rounded-lg text-lg text-right" placeholder="לדוגמה: סחיבת איכר">
        </div>
        <div>
            <label for="setting-stretcher-carrier-noun-plural" class="block text-right mb-1 text-sm font-medium">מלל לבחירה (לדוג': 'איכרים')</label>
            <input type="text" id="setting-stretcher-carrier-noun-plural" value="${CONFIG.STRETCHER_CARRIER_NOUN_PLURAL}" class="w-full p-2 border border-gray-300 rounded-lg text-lg text-right" placeholder="יופיע במלל: בחר עד X ...">
        </div>
    </div>
    <div class="flex justify-center gap-4 mt-6">
        <button id="save-settings-btn" class="bg-green-600 hover:bg-green-700 text-white text-xl font-bold py-3 px-6 rounded-lg shadow-lg">שמור הגדרות ואפס</button>
        <button id="cancel-settings-btn" class="bg-gray-500 hover:bg-gray-600 text-white text-xl font-bold py-3 px-6 rounded-lg shadow-lg">ביטול</button>
    </div>`;

        const themeModeSelect = document.getElementById('theme-mode-select');
        if (themeModeSelect) {
            themeModeSelect.value = state.themeMode || 'auto';
            themeModeSelect.addEventListener('change', (e) => {
                state.themeMode = e.target.value;
                applyTheme();
                saveState();
                render();
            });
        }

        document.getElementById('save-settings-btn').addEventListener('click', () => {
            showModal('אישור שינוי הגדרות', 'פעולה זו תאפס את כל נתוני הגיבוש (רצים, מקצים, הערות וכו\'). האם אתה בטוח שברצונך להמשיך?', () => {

                CONFIG.MAX_RUNNERS = parseInt(document.getElementById('setting-max-runners').value) || CONFIG.MAX_RUNNERS;
                CONFIG.NUM_HEATS = parseInt(document.getElementById('setting-num-heats').value) || CONFIG.NUM_HEATS;
                CONFIG.MAX_CRAWLING_SPRINTS = parseInt(document.getElementById('setting-crawling-sprints').value) || CONFIG.MAX_CRAWLING_SPRINTS;
                CONFIG.NUM_STRETCHER_HEATS = parseInt(document.getElementById('setting-stretcher-heats').value) || CONFIG.NUM_STRETCHER_HEATS;
                CONFIG.MAX_STRETCHER_CARRIERS = parseInt(document.getElementById('setting-max-stretcher-carriers').value) || CONFIG.MAX_STRETCHER_CARRIERS;
                CONFIG.MAX_JERRICAN_CARRIERS = parseInt(document.getElementById('setting-max-jerrican-carriers').value) || CONFIG.MAX_JERRICAN_CARRIERS;
                CONFIG.STRETCHER_PAGE_LABEL = document.getElementById('setting-stretcher-page-label').value.trim() || CONFIG.STRETCHER_PAGE_LABEL;
                CONFIG.STRETCHER_CARRIER_NOUN_PLURAL = document.getElementById('setting-stretcher-carrier-noun-plural').value.trim() || CONFIG.STRETCHER_CARRIER_NOUN_PLURAL;

                state.currentPage = PAGES.RUNNERS;
                initializeAllData();
                saveState();
                render();
                showModal('הגדרות נשמרו', 'ההגדרות נשמרו ונתוני הגיבוש אופסו.');
            });
        });

        document.getElementById('cancel-settings-btn').addEventListener('click', () => {
            state.currentPage = state.lastPage;
            render();
        });
    };
})();