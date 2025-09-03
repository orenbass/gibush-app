(function () {
    window.Pages = window.Pages || {};
    window.Pages.renderRunnersPage = function renderRunnersPage() {
        headerTitle.textContent = 'ניהול קבוצה';

        // אם אין פרטי הערכה - הצג חלון התחלתי
        if (!state.evaluatorName || !state.groupNumber) {
            renderInitialSetupModal();
            return;
        }

        const todayDate = new Date().toLocaleDateString('he-IL');
        const currentTime = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

        const hasRunners = state.runners && state.runners.length > 0;

        contentDiv.innerHTML = `
<!-- פרטי הערכה (קבועים) - עם כפתור עריכה בצד שמאל למעלה -->
    <div class="evaluation-info bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg shadow-inner mb-6 border-2 border-blue-200 dark:border-blue-700 relative">
        <!-- כפתור ערוך פרטים בצד שמאל למעלה -->
        <button id="edit-details-btn" class="absolute top-2 left-2 bg-gray-500 hover:bg-gray-600 text-white font-bold py-1 px-3 rounded-lg text-sm">
            ערוך פרטים
        </button>
        
        <h2 class="text-2xl font-bold mb-4 text-center text-blue-600 dark:text-blue-400">פרטי הערכה</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
            <div class="text-lg"><strong class="text-xl">שם המעריך:</strong> <span class="text-xl font-semibold text-blue-800 dark:text-blue-300">${state.evaluatorName}</span></div>
            <div class="text-lg"><strong class="text-xl">מספר קבוצה:</strong> <span class="text-xl font-semibold text-blue-800 dark:text-blue-300">${state.groupNumber}</span></div>
        </div>
        <div class="flex justify-between items-center text-gray-600 dark:text-gray-400 font-medium text-base mt-4">
            <span><strong>תאריך:</strong> ${todayDate}</span>
            <span><strong>שעה:</strong> ${currentTime}</span>
        </div>
    </div>

    ${!hasRunners ? `
    <!-- כפתור הוספת מועמדים - רק כשאין מועמדים -->
    <div class="mb-4 text-center">
        <button id="add-runners-btn" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-md">
            הוסף מועמדים לקבוצה
        </button>
    </div>
    ` : ''}

    ${hasRunners ? `
    <!-- רשימת מועמדים קיימים עם כפתור עריכה -->
    <div class="relative mb-6">
        <h2 class="text-xl font-semibold mb-4 text-center text-blue-500">מועמדי הקבוצה (${state.runners.length})</h2>
        <div class="mb-2 text-center relative">
            <span class="text-lg font-semibold text-gray-700 dark:text-gray-300">מספרי כתף</span>
            <!-- כפתור עריכת מועמדים בצד שמאל למעלה -->
            <button id="edit-runners-btn" class="absolute top-0 left-0 bg-orange-500 hover:bg-orange-600 text-white font-bold py-1 px-3 rounded-lg text-sm">
                ערוך מועמדים
            </button>
        </div>
        <div id="runner-list" class="space-y-2"></div>
        <div id="runner-edit-area" class="hidden mt-4">
            <div id="editable-runner-list" class="space-y-2"></div>
            <div class="flex justify-center gap-4 mt-4">
                <button id="add-runner-row" class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">
                    + הוסף מועמד
                </button>
                <button id="save-runners-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">
                    שמור שינויים
                </button>
                <button id="cancel-runners-btn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">
                    ביטול
                </button>
            </div>
            <div id="runner-edit-error" class="mt-4 text-red-500 text-center text-sm hidden"></div>
        </div>
    </div>
    
    <!-- כפתור התחלת מקצים -->
    <div class="flex justify-center mt-6">
        <button id="start-heats-btn" class="bg-green-600 hover:bg-green-700 text-white text-xl font-bold py-3 px-6 rounded-lg shadow-lg w-full">
            התחל מקצים
        </button>
    </div>
    ` : `
    <div class="text-center text-gray-500 dark:text-gray-400 py-8">
        <p class="text-lg mb-2">🏃‍♂️ אין עדיין מועמדים בקבוצה</p>
        <p>לחץ על "הוסף מועמדים לקבוצה" כדי להתחיל</p>
    </div>
    `}

    <div id="runner-error" class="mt-4 text-red-500 text-center font-bold hidden"></div>

    <!-- ניהול נתונים -->
    <div class="mt-8 border-t pt-4 border-gray-300 dark:border-gray-600">
        <h3 class="text-lg font-semibold mb-3 text-center text-gray-700 dark:text-gray-300">ניהול נתונים</h3>
        <div class="flex justify-center gap-4 flex-wrap">
            <button id="admin-settings-btn" class="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-lg text-sm">הגדרות מנהל</button>
            <button id="export-backup-btn" class="bg-blue-800 hover:bg-blue-900 text-white font-bold py-2 px-4 rounded-lg text-sm">ייצא גיבוי (JSON)</button>
            <input type="file" id="import-backup-input" class="hidden" accept=".json">
            <button id="import-backup-btn" class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg text-sm">ייבא גיבוי (JSON)</button>
            <button id="reset-app-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg text-sm">אפס אפליקציה</button>
        </div>
    </div>`;

        // הצגת רשימת מועמדים אם קיימים
        if (hasRunners) {
            renderRunnerList();
        }

        // Event listeners
        document.getElementById('add-runners-btn')?.addEventListener('click', showAddRunnersModal);
        document.getElementById('edit-details-btn')?.addEventListener('click', showEditBasicDetailsModal);
        document.getElementById('edit-runners-btn')?.addEventListener('click', showRunnerEditMode);
        document.getElementById('start-heats-btn')?.addEventListener('click', validateAndStartHeats);
        document.getElementById('admin-settings-btn')?.addEventListener('click', handleAdminSettingsClick);
        document.getElementById('reset-app-btn')?.addEventListener('click', () => showModal('איפוס אפליקציה', 'האם אתה בטוח? כל הנתונים יימחקו לצמיתות.', () => {
            localStorage.removeItem(CONFIG.APP_STATE_KEY);
            CONFIG = { NUM_HEATS: 14, MAX_CRAWLING_SPRINTS: 4, MAX_RUNNERS: 20, MAX_SACK_CARRIERS: 3, NUM_STRETCHER_HEATS: 8, MAX_STRETCHER_CARRIERS: 4, MAX_JERRICAN_CARRIERS: 3, STRETCHER_PAGE_LABEL: 'אלונקות', STRETCHER_CARRIER_NOUN_PLURAL: 'רצים שלקחו אלונקה', APP_STATE_KEY: 'sprintAppState_v1.11' };
            state.currentPage = PAGES.RUNNERS;
            initializeAllData();
            saveState();
            render();
        }));
        document.getElementById('export-backup-btn')?.addEventListener('click', exportBackup);
        document.getElementById('import-backup-btn')?.addEventListener('click', () => document.getElementById('import-backup-input').click());
        document.getElementById('import-backup-input')?.addEventListener('change', importBackup);
    };
})();