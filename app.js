// FIX: declare deferredInstallPrompt explicitly + scoped logging helper
let deferredInstallPrompt = null;
function logPWA(...args){ console.log('[PWA]', ...args); }

if ("serviceWorker" in navigator) {
    // FIX: use relative path so scope works when not hosted at domain root
    navigator.serviceWorker.register("./service-worker.js")
        .then(reg => {
            logPWA('Service worker registered', reg.scope);
        })
        .catch(err => {
            logPWA('Service worker registration failed', err);
        });
}

// --- Global State ---

// אובייקט מצב מרכזי המכיל את כל נתוני האפליקציה.

// המצב הזה נשמר ונטען מ-localStorage.

const state = {

    currentPage: PAGES.RUNNERS, // הדף הפעיל הנוכחי

    lastPage: PAGES.RUNNERS,    // מאחסן את הדף האחרון שבו ביקרנו לפני סטטוס/הגדרות מנהל

    runners: [],         // מערך של אובייקטי רצים { shoulderNumber: number }

    heats: [],           // מערך של אובייקטי מקצי ספרינט

    currentHeatIndex: 0,     // אינדקס המקצה הנוכחי המוצג

    timer: null,             // מזהה מרווח (Interval ID) לטיימר הראשי

    startTime: 0,            // חותמת זמן של התחלת המקצה/ספרינט הנוכחי

    isTimerRunning: false,       // דגל המציין אם הטיימר הראשי פעיל

    evaluatorName: '',   // שם המעריך

    groupNumber: '',         // מספר הקבוצה

    crawlingDrills: {},      // אובייקט לנתוני תרגילי זחילה (הערות, ספרינטים, נושאי שק)

    generalComments: {}, // הוספת שדה להערות כלליות

    quickComments: {},    // { shoulderNumber: [ 'tag1', 'tag2', ... ] }

    sociometricStretcher: {},    // אובייקט לנתוני אלונקה סוציומטרית (מקצים, נושאים, הערות)

    themeMode: 'auto', // אפשרויות: 'auto', 'light', 'dark'

    manualScores: {},

    isEditingScores: false // מצב עריכה

};

window.state = state;

// --- DOM Elements ---

// הפניות לאלמנטים מרכזיים ב-DOM לצורך מניפולציה יעילה
let contentDiv = document.getElementById('content');
let headerTitle = document.getElementById('header-title');
let autosaveStatus = document.getElementById('autosave-status');
let loadingOverlay = document.getElementById('loading-overlay'); // V1.11 - Added loading overlay
let loadingText = document.getElementById('loading-text'); // Added loading text element
let tempStateBackup = null; // גיבוי זמני למצב עריכה בדוח

// Ensure a global page registry exists for external page modules
window.Pages = window.Pages || {};

// עזר: לוודא שהפניות ל-DOM קיימות (במיוחד אם הסקריפט רץ לפני טעינת ה-DOM)
function ensureDomRefs() {
    if (!contentDiv) contentDiv = document.getElementById('content');
    if (!headerTitle) headerTitle = document.getElementById('header-title');
    if (!autosaveStatus) autosaveStatus = document.getElementById('autosave-status');
    if (!loadingOverlay) loadingOverlay = document.getElementById('loading-overlay');
    if (!loadingText) loadingText = document.getElementById('loading-text');
}

// --- Utility functions moved to utils ---
// Moved to js/utils/time.js: formatTime, formatTime_no_ms, updateTimerDisplay
// Moved to js/utils/modal.js: showModal, confirmLeaveCrawlingComments
// Moved to js/utils/scoring.js: normalizeScore, computeHeatResults, get*Results, calculate*Score

function setupPWAInstallUI() {
    const installBtn = document.getElementById('install-btn');
    if (!installBtn) return;
    const isApple = /iP(hone|ad|od)|Mac/i.test(navigator.userAgent);
    if (isApple) {
        // iOS אין beforeinstallprompt – נשאיר מוסתר
        installBtn.style.display = 'none';
        return;
    }
    // בהתחלה חבוי עד beforeinstallprompt
    installBtn.style.display = 'none';

    installBtn.addEventListener('click', async () => {
        if (!deferredInstallPrompt) {
            showModal('התקנה', 'לא זמינה כרגע (beforeinstallprompt לא ירה). ודא: HTTPS, service worker תקין, ביקור אחד לפחות בעמוד.');
            return;
        }
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice.catch(() => ({}));
        logPWA('User choice', choice);
        deferredInstallPrompt = null;
        installBtn.style.display = 'none';
    });
}

// UPDATED listener with logs + safe display
window.addEventListener('beforeinstallprompt', (event) => {
    logPWA('beforeinstallprompt fired');
    event.preventDefault();
    deferredInstallPrompt = event;
    const installBtn = document.getElementById('install-btn');
    if (installBtn) installBtn.style.display = 'inline-flex';
});

window.addEventListener('appinstalled', () => {
    logPWA('PWA installed');
    const installBtn = document.getElementById('install-btn');
    if (installBtn) installBtn.style.display = 'none';
    deferredInstallPrompt = null;
});

// --- Data Persistence & Initialization ---



/**

 * Saves the current application state to localStorage.

 * Handles cleaning up non-serializable properties (like timer intervals) before saving.

 */

function saveState() {

    try {

        // Create a deep copy of the state to avoid modifying the live state during serialization

        const fullStateToSave = {

            config: CONFIG,

            appState: state

        };

        const stateToSave = JSON.parse(JSON.stringify(fullStateToSave));



        // Clear timer intervals from sackCarriers before saving, as they are not serializable

        if (stateToSave.appState.crawlingDrills && stateToSave.appState.crawlingDrills.sackCarriers) {

            for (const shoulderNumber in stateToSave.appState.crawlingDrills.sackCarriers) {

                if (stateToSave.appState.crawlingDrills.sackCarriers[shoulderNumber].timerInterval) {

                    stateToSave.appState.crawlingDrills.sackCarriers[shoulderNumber].timerInterval = null;

                }

            }

        }

        localStorage.setItem(CONFIG.APP_STATE_KEY, JSON.stringify(stateToSave));



        // V1 - Show autosave status briefly (guard if element missing)
        if (autosaveStatus) {
            autosaveStatus.style.opacity = '1';
            setTimeout(() => { autosaveStatus.style.opacity = '0'; }, 1000);
        }

    } catch (e) {

        console.error("Failed to save state to localStorage", e);

        // Use custom modal instead of alert

        showModal('שגיאת שמירה', 'שגיאה: לא ניתן היה לשמור את נתוני האפליקציה. אנא נסה שוב או בדוק את אחסון המכשיר שלך.');

    }

}



/**

 * Loads the application state from localStorage.

 * Initializes default data if no saved state is found or if parsing fails.

 */

function loadState() {

    try {

        const savedData = localStorage.getItem(CONFIG.APP_STATE_KEY);

        if (savedData) {

            const fullLoadedState = JSON.parse(savedData);

            // Restore CONFIG if present in saved data

            if (fullLoadedState.config) {

                // Merge loaded config with defaults to ensure new settings are present

                CONFIG = { ...CONFIG, ...fullLoadedState.config };

            }

            // Merge loaded appState into the current state object

            Object.assign(state, fullLoadedState.appState || fullLoadedState);



            // Re-initialize specific data structures if their lengths don't match CONFIG

            // This handles cases where CONFIG changes or data is corrupted/incomplete

            if (!state.heats || state.heats.length !== CONFIG.NUM_HEATS) initializeHeats();

            if (!state.crawlingDrills || !state.crawlingDrills.sprints || state.crawlingDrills.sprints.length !== CONFIG.MAX_CRAWLING_SPRINTS) initializeCrawlingDrills();

            if (!state.sociometricStretcher || !state.sociometricStretcher.heats || state.sociometricStretcher.heats.length !== CONFIG.NUM_STRETCHER_HEATS) initializeSociometricStretcherHeats();

            // Ensure activeSackCarriers array exists

            if (!state.crawlingDrills.activeSackCarriers) state.crawlingDrills.activeSackCarriers = [];

            // V1.1 - Ensure theme exists, default to 'light'

            state.theme = state.theme || 'light';

        } else {

            // If no saved data, initialize all data from scratch

            initializeAllData();

        }

    } catch (e) {

        console.error("Failed to load or parse state. Resetting data.", e);

        // Use custom modal instead of alert

        showModal('שגיאת טעינה', 'שגיאה בקריאת הנתונים. ייתכן שהנתונים הקיימים פגומים. האפליקציה תאופס.');

        initializeAllData(); // Reset all data on error

    }

}



/**

 * Initializes all core data structures of the application to their default empty states.

 * Called on first load or when resetting the app.

 */

function initializeAllData() {

    state.runners = [];

    state.currentHeatIndex = 0;

    state.evaluatorName = '';

    state.groupNumber = '';

    initializeHeats();

    initializeCrawlingDrills();

    initializeSociometricStretcherHeats();

}



/**

 * Initializes the sprint heats array based on CONFIG.NUM_HEATS.

 */

function initializeHeats() {

    state.heats = Array.from({ length: CONFIG.NUM_HEATS }, (_, i) => ({

        heatNumber: i + 1,

        arrivals: [],

        started: false,

        finished: false

    }));

}



/**

 * Initializes the crawling drills data structure.

 */

function initializeCrawlingDrills() {

    state.crawlingDrills = {

        comments: {}, // General comments for each runner

        sprints: Array.from({ length: CONFIG.MAX_CRAWLING_SPRINTS }, (_, i) => ({

            heatNumber: i + 1,

            arrivals: [],

            started: false,

            finished: false

        })),

        currentSprintIndex: 0,

        sackCarriers: {}, // Stores sack carrying times for each runner

        runnerStatuses: {}, // Stores global status for each runner (e.g., 'retired', 'temp_removed')

        activeSackCarriers: [] // List of shoulder numbers currently carrying sacks

    };

}

// Ensure correct classes/structure (defensive) without changing labels
function refreshNavigationTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        // Make sure tab has decent base classes (in case of legacy)
        tab.classList.add('rounded-xl');

        // Keep two-span structure if exists (icon + label). If not, don't mutate content.
        const spans = tab.querySelectorAll('span');
        if (spans.length === 2) {
            // Label remains spans[1] (used elsewhere in code)
            // spans[0] can stay as icon node (we don't replace here to avoid breaking user choices)
        }
    });
}
/**
 * Initializes the sociometric stretcher heats data structure for counting selections.
 */
function initializeSociometricStretcherHeats() {
    state.sociometricStretcher = {
        heats: Array.from({ length: CONFIG.NUM_STRETCHER_HEATS }, (_, i) => ({
            heatNumber: i + 1,
            selections: {} // { '101': 'stretcher' | 'jerrican' }
            // usedChoices הוסר – ניתן לבחור/לבטל חופשי
        })),
        currentHeatIndex: 0
    };
}

// --- Runner Management & Backup/Restore ---

/**
 * הצגת חלון התחלתי להזנת פרטי מעריך וקבוצה
 */
function renderInitialSetupModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50';
    backdrop.id = 'initial-setup-modal';

    backdrop.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md mx-4 text-right">
        <h3 class="text-xl font-bold mb-4 text-center text-blue-600 dark:text-blue-400">ברוכים הבאים לאפליקציית הגיבוש</h3>
        <p class="text-gray-700 dark:text-gray-300 mb-6 text-center">אנא הזן את פרטי ההערכה להתחלה</p>
        
        <div class="space-y-4">
            <div>
                <label class="block text-right mb-1 text-sm font-medium">שם המעריך:</label>
                <input type="text" id="initial-evaluator-name" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg text-lg text-right bg-white dark:bg-gray-700 dark:text-white" placeholder="הכנס שם מעריך">
            </div>
            <div>
                <label class="block text-right mb-1 text-sm font-medium">מספר קבוצה:</label>
                <input type="text" id="initial-group-number" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg text-lg text-right bg-white dark:bg-gray-700 dark:text-white" placeholder="הכנס מספר קבוצה">
            </div>
        </div>
        
        <div class="text-center mt-6">
            <button id="save-initial-details" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                המשך
            </button>
        </div>
        
        <div id="initial-error" class="mt-4 text-red-500 text-center text-sm hidden"></div>
    </div>`;

    document.body.appendChild(backdrop);

    const evaluatorInput = document.getElementById('initial-evaluator-name');
    const groupInput = document.getElementById('initial-group-number');
    const saveBtn = document.getElementById('save-initial-details');
    const errorDiv = document.getElementById('initial-error');

    const validateInputs = () => {
        const hasEvaluator = evaluatorInput.value.trim().length > 0;
        const hasGroup = groupInput.value.trim().length > 0;
        saveBtn.disabled = !hasEvaluator || !hasGroup;
    };

    evaluatorInput.addEventListener('input', validateInputs);
    groupInput.addEventListener('input', validateInputs);
    evaluatorInput.focus();

    saveBtn.addEventListener('click', () => {
        const evaluatorName = evaluatorInput.value.trim();
        const groupNumber = groupInput.value.trim();

        if (!evaluatorName || !groupNumber) {
            errorDiv.textContent = 'יש למלא את כל השדות';
            errorDiv.classList.remove('hidden');
            return;
        }

        state.evaluatorName = evaluatorName;
        state.groupNumber = groupNumber;
        saveState();
        document.body.removeChild(backdrop);
        render();
    });

    validateInputs();
}

/**
 * הצגת חלון הוספת רצים
 */
// החלף את הפונקציה showAddRunnersModal הקיימת:
function showAddRunnersModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50';
    backdrop.id = 'add-runners-modal';

    const hasExistingRunners = state.runners && state.runners.length > 0;

    backdrop.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md mx-4 text-right">
        <h3 class="text-xl font-bold mb-4 text-center text-blue-600 dark:text-blue-400">הוספת מועמדים לקבוצה</h3>
        
        ${!hasExistingRunners ? `
        <div class="space-y-4 mb-6">
            <button id="random-runners-btn" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg">
                הוספה רנדומלית (${CONFIG.MAX_RUNNERS} מועמדים)
            </button>
            <button id="manual-runners-btn" class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg">
                הוספה ידנית
            </button>
        </div>
        ` : ''}
        
        <!-- אזור הוספה ידנית -->
        <div id="manual-input-area" class="${hasExistingRunners ? '' : 'hidden'}">
            <div class="${hasExistingRunners ? '' : 'border-t pt-4'} mb-4">
                <div class="flex gap-2 mb-3">
                    <input type="number" id="manual-shoulder-input" placeholder="מספר כתף" 
                           class="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-700 dark:text-white" min="1" max="999">
                    <button id="add-single-runner" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium">
                        הוסף
                    </button>
                </div>
                <div class="text-center mb-3">
                    <span class="text-sm text-gray-600 dark:text-gray-400">מועמדים בקבוצה: <span id="runner-count">${state.runners.length}</span>/${CONFIG.MAX_RUNNERS}</span>
                </div>
                
                <!-- הצגת רצים שנוספו במודל -->
                <div id="modal-runner-list" class="max-h-40 overflow-y-auto mb-3">
                    ${state.runners.slice().sort((a, b) => a.shoulderNumber - b.shoulderNumber).map((runner, index) => `
                        <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-600 rounded mb-1">
                            <span class="text-sm">${index + 1}.</span>
                            <span class="font-medium">${runner.shoulderNumber}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        
        <div class="flex justify-center gap-4">
            <button id="finish-adding" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">
                סיום
            </button>
            <button id="cancel-adding" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">
                ביטול
            </button>
        </div>
        
        <div id="add-error" class="mt-4 text-red-500 text-center text-sm hidden"></div>
    </div>`;

    document.body.appendChild(backdrop);

    const manualArea = document.getElementById('manual-input-area');
    const shoulderInput = document.getElementById('manual-shoulder-input');
    const runnerCountSpan = document.getElementById('runner-count');
    const errorDiv = document.getElementById('add-error');
    const modalRunnerList = document.getElementById('modal-runner-list');

    // Focus על השדה אם כבר פתוח
    if (hasExistingRunners) {
        shoulderInput.focus();
    }

    // כפתורים
    document.getElementById('random-runners-btn')?.addEventListener('click', () => {
        generateRandomRunners();
        closeModal();
    });

    document.getElementById('manual-runners-btn')?.addEventListener('click', () => {
        manualArea.classList.remove('hidden');
        shoulderInput.focus();
    });

    document.getElementById('add-single-runner').addEventListener('click', addSingleRunner);
    document.getElementById('finish-adding').addEventListener('click', closeModal);
    document.getElementById('cancel-adding').addEventListener('click', closeModal);

    shoulderInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSingleRunner();
        }
    });

    function addSingleRunner() {
        const shoulderNumber = parseInt(shoulderInput.value);

        if (!shoulderNumber || shoulderNumber <= 0) {
            showAddError('יש להזין מספר כתף תקין');
            return;
        }

        if (state.runners.length >= CONFIG.MAX_RUNNERS) {
            showAddError(`לא ניתן להוסיף יותר מ-${CONFIG.MAX_RUNNERS} מועמדים`);
            return;
        }

        if (state.runners.some(r => r.shoulderNumber === shoulderNumber)) {
            showAddError('מספר כתף זה כבר קיים');
            return;
        }

        // הוספת הרץ למערך
        state.runners.push({ shoulderNumber });
        state.runners.sort((a, b) => a.shoulderNumber - b.shoulderNumber);
        saveState();

        // עדכון התצוגה במודל
        shoulderInput.value = '';
        runnerCountSpan.textContent = state.runners.length;
        updateModalRunnerList();
        errorDiv.classList.add('hidden');
        shoulderInput.focus();
    }

    function updateModalRunnerList() {
        const sortedRunners = state.runners.slice().sort((a, b) => a.shoulderNumber - b.shoulderNumber);
        modalRunnerList.innerHTML = sortedRunners.map((runner, index) => `
            <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-600 rounded mb-1">
                <span class="text-sm">${index + 1}.</span>
                <span class="font-medium">${runner.shoulderNumber}</span>
            </div>
        `).join('');
    }

    function showAddError(message) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }

    function closeModal() {
        document.body.removeChild(backdrop);
        render(); // רינדור מחדש של כל העמוד
    }
}

// החלף את הפונקציה updateMainPageRunnerList הקיימת:
function updateMainPageRunnerList() {
    // פונקציה זו כבר לא נדרשת כי אנחנו עושים render() מלא
    // אבל נשאיר אותה למקרה שמשתמשים בה במקום אחר
    if (document.getElementById('runner-list')) {
        renderRunnerList();

        // עדכן גם את הכותרת עם מספר הרצים
        const titleElement = document.querySelector('h2.text-blue-500');
        if (titleElement && titleElement.textContent.includes('מועמדי הקבוצה')) {
            titleElement.textContent = `מועמדי הקבוצה (${state.runners.length})`;
        }
    }
}

/**
 * הצגת חלון עריכת פרטים
 */
function showEditDetailsModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50';
    backdrop.id = 'edit-details-modal';

    backdrop.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-lg mx-4 text-right max-h-[90vh] overflow-y-auto">
        <h3 class="text-xl font-bold mb-4 text-center text-blue-600 dark:text-blue-400">עריכת פרטי קבוצה</h3>
        
        <!-- פרטי מעריך וקבוצה -->
        <div class="space-y-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
                <label class="block text-right mb-1 text-sm font-medium">שם המעריך:</label>
                <input type="text" id="edit-evaluator-name" value="${state.evaluatorName}" 
                       class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-lg text-right bg-white dark:bg-gray-700 dark:text-white">
            </div>
            <div>
                <label class="block text-right mb-1 text-sm font-medium">מספר קבוצה:</label>
                <input type="text" id="edit-group-number" value="${state.groupNumber}" 
                       class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-lg text-right bg-white dark:bg-gray-700 dark:text-white">
            </div>
        </div>
        
        <!-- רשימת רצים לעריכה -->
        <div class="mb-6">
            <h4 class="text-lg font-semibold mb-3 text-center">רצי הקבוצה</h4>
            <div id="edit-runner-list" class="space-y-2 max-h-60 overflow-y-auto"></div>
        </div>
        
        <div class="flex justify-center gap-4">
            <button id="save-edit-details" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">
                שמור שינויים
            </button>
            <button id="cancel-edit-details" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">
                ביטול
            </button>
        </div>
        
        <div id="edit-error" class="mt-4 text-red-500 text-center text-sm hidden"></div>
    </div>`;

    document.body.appendChild(backdrop);

    renderEditRunnerList();

    document.getElementById('save-edit-details').addEventListener('click', saveEditDetails);
    document.getElementById('cancel-edit-details').addEventListener('click', () => {
        document.body.removeChild(backdrop);
    });

    function renderEditRunnerList() {
        const listDiv = document.getElementById('edit-runner-list');
        listDiv.innerHTML = state.runners.map((runner, index) => `
            <div class="flex items-center gap-2 p-2 bg-white dark:bg-gray-600 rounded border">
                <span class="w-8 text-center font-medium">${index + 1}.</span>
                <input type="number" class="edit-runner-input flex-1 p-1 border border-gray-300 dark:border-gray-500 rounded text-center bg-white dark:bg-gray-700 dark:text-white" 
                       value="${runner.shoulderNumber}" data-index="${index}" min="1" max="999">
                <button class="remove-edit-runner bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm" data-index="${index}">
                    מחק
                </button>
            </div>
        `).join('');

        // מאזינים למחיקה
        listDiv.querySelectorAll('.remove-edit-runner').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                state.runners.splice(index, 1);
                saveState();
                renderEditRunnerList();
            });
        });
    }

    function saveEditDetails() {
        const evaluatorName = document.getElementById('edit-evaluator-name').value.trim();
        const groupNumber = document.getElementById('edit-group-number').value.trim();
        const errorDiv = document.getElementById('edit-error');

        if (!evaluatorName || !groupNumber) {
            errorDiv.textContent = 'יש למלא את שם המעריך ומספר הקבוצה';
            errorDiv.classList.remove('hidden');
            return;
        }

        // עדכון מספרי כתף
        const runnerInputs = document.querySelectorAll('.edit-runner-input');
        const newRunners = [];
        const usedNumbers = new Set();

        for (const input of runnerInputs) {
            const shoulderNumber = parseInt(input.value);
            if (!shoulderNumber || shoulderNumber <= 0) {
                errorDiv.textContent = 'כל מספרי הכתף חייבים להיות מספרים חיוביים';
                errorDiv.classList.remove('hidden');
                return;
            }
            if (usedNumbers.has(shoulderNumber)) {
                errorDiv.textContent = 'נמצאו מספרי כתף כפולים';
                errorDiv.classList.remove('hidden');
                return;
            }
            usedNumbers.add(shoulderNumber);
            newRunners.push({ shoulderNumber });
        }

        // שמירת השינויים
        state.evaluatorName = evaluatorName;
        state.groupNumber = groupNumber;
        state.runners = newRunners.sort((a, b) => a.shoulderNumber - b.shoulderNumber);
        saveState();

        document.body.removeChild(backdrop);
        render();
    }
}

/**
 * רינדור רשימת הרצים בעמוד הראשי
 */
function renderRunnerList() {
    const runnerListDiv = document.getElementById('runner-list');
    if (!runnerListDiv) return;

    const sortedRunners = state.runners.slice().sort((a, b) => a.shoulderNumber - b.shoulderNumber);

    runnerListDiv.innerHTML = sortedRunners.map((runner, index) => `
        <div class="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
            <span class="text-gray-600 dark:text-gray-400 text-base">${index + 1}.</span>
            <span class="font-bold text-lg text-blue-600 dark:text-blue-400">${runner.shoulderNumber}</span>
        </div>
    `).join('');
}

function updateMainPageRunnerList() {
    // בדוק אם אנחנו בעמוד הראשי ויש רשימת רצים
    if (document.getElementById('runner-list')) {
        renderRunnerList();

        // עדכן גם את הכותרת עם מספר הרצים
        const titleElement = document.querySelector('h2.text-blue-500');
        if (titleElement && titleElement.textContent.includes('מועמדי הקבוצה')) {
            titleElement.textContent = `מועמדי הקבוצה (${state.runners.length})`;
        }
    }
}
// עדכון פונקציית validateAndStartHeats
function validateAndStartHeats() {
    if (state.runners.length === 0) {
        showError("יש להוסיף לפחות מועמד אחד כדי להתחיל.");
        return;
    }

    state.currentPage = PAGES.HEATS;
    saveState();
    renderPage(); // FIXED: שימוש ב-renderPage במקום render
}
/**

 * Displays an error message on the runners page.

 * @param {string} message - The error message to display.

 */

function showError(message) {

    const errorDiv = document.getElementById('runner-error');

    errorDiv.textContent = message;

    errorDiv.classList.remove('hidden'); // Show the error div

}



/**

 * Exports the current application state as a JSON backup file.

 */

function exportBackup() {

    try {

        // Create a deep copy of the state for export, similar to saveState

        const backupData = JSON.stringify({ config: CONFIG, appState: state }, null, 2);

        const blob = new Blob([backupData], { type: 'application/json' });

        const link = document.createElement('a');

        link.href = URL.createObjectURL(blob);

        const date = new Date().toLocaleDateString('he-IL').replace(/\./g, '-');

        link.download = `GibushBackup_v1.11_${state.groupNumber || 'group'}_${date}.json`;

        link.click();

    } catch (e) {

        console.error("Failed to create backup", e);

        showModal('שגיאת גיבוי', 'שגיאה ביצירת קובץ הגיבוי. אנא נסה שוב.');

    }

}



/**

 * Imports application state from a selected JSON backup file.

 * Prompts for confirmation before overwriting current data.

 * @param {Event} event - The change event from the file input.

 */

function importBackup(event) {

    const file = event.target.files[0];

    if (!file) return; // No file selected



    const reader = new FileReader();

    reader.onload = (e) => {

        try {

            const importedData = JSON.parse(e.target.result);

            // Show a confirmation modal before proceeding with import

            showModal('אישור ייבוא נתונים', 'האם אתה בטוח? פעולה זו תחליף את כל הנתונים הנוכחיים בנתונים מהקובץ.', () => {

                // Restore CONFIG and appState from imported data

                CONFIG = { ...CONFIG, ...(importedData.config || {}) };

                Object.assign(state, importedData.appState || importedData);

                // Reset timer-related state variables as they are not persistent

                state.timer = null;

                state.isTimerRunning = false;

                saveState(); // Save the newly imported state
                renderPage(); // FIXED: Re-render the UI
                showModal('ייבוא הצלחה', 'הנתונים יובאו בהצלחה!');

            });

        } catch (error) {

            console.error("Failed to parse backup file", error);

            showModal('שגיאת ייבוא', 'שגיאה: קובץ הגיבוי אינו תקין או פגום.');

        }

    };

    reader.readAsText(file); // Read the file as text

    event.target.value = ''; // Clear the file input to allow re-importing the same file

}



/**

 * Handles the click event for the Admin Settings button, requiring a password.

 */

function handleAdminSettingsClick() {

    showModal(

        'הזן קוד מנהל',

        'כדי לגשת להגדרות המערכת, יש להזין את קוד הגישה.',

        null,

        true, // isInputModal = true

        (password) => {

            if (password === ADMIN_PASSWORD) {

                state.currentPage = PAGES.ADMIN_SETTINGS;

                render();

            } else {

                showModal('שגיאת אימות', 'קוד הגישה שגוי. נסה שוב.');

            }

        }

    );

}



// --- Core Logic ---



/**

 * Handles changes to a runner's global status (active, temporary removed, retired).

 * Updates runnerStatuses and removes/adds arrivals in future heats as necessary.

 * Stops sack timers if a runner becomes inactive.

 * @param {Event} event - The click event from the status button.

 * @param {number|null} heatIndexContext - The current heat index, or null if from global status management.

 */

function handleGlobalStatusChange(event, heatIndexContext) {

    const shoulderNumber = parseInt(event.currentTarget.dataset.shoulderNumber);

    const newStatus = event.currentTarget.dataset.status;



    if (newStatus === 'active') {

        // If status changes to active, remove from runnerStatuses

        delete state.crawlingDrills.runnerStatuses[shoulderNumber];

        // If coming from a heat context, remove from future heat arrivals

        if (heatIndexContext !== null) {

            for (let i = heatIndexContext; i < CONFIG.NUM_HEATS; i++) {

                const arrivalIndex = state.heats[i].arrivals.findIndex(a => a.shoulderNumber === shoulderNumber);

                if (arrivalIndex !== -1) state.heats[i].arrivals.splice(arrivalIndex, 1);

            }

        }

    } else {

        // If status changes to temp_removed or retired, set in runnerStatuses

        state.crawlingDrills.runnerStatuses[shoulderNumber] = newStatus;

        // If coming from a heat context, add a comment to future heat arrivals

        if (heatIndexContext !== null) {

            for (let i = heatIndexContext; i < CONFIG.NUM_HEATS; i++) {

                const heat = state.heats[i];

                const existingArrivalIndex = heat.arrivals.findIndex(a => a.shoulderNumber === shoulderNumber);

                const comment = newStatus === 'temp_removed' ? 'נגרע זמנית' : 'פרש';

                if (existingArrivalIndex === -1) {

                    // Add new arrival with comment if not already present

                    heat.arrivals.push({ shoulderNumber, finishTime: null, comment, status: newStatus });

                } else {

                    // Update existing arrival with new status/comment

                    heat.arrivals[existingArrivalIndex].comment = comment;

                    heat.arrivals[existingArrivalIndex].status = newStatus;

                }

            }

        }

    }

    // If the runner was a sack carrier, stop their timer and remove them from active carriers

    const sackIndex = state.crawlingDrills.activeSackCarriers.indexOf(shoulderNumber);

    if (sackIndex > -1) {

        stopSackTimer(shoulderNumber);

        state.crawlingDrills.activeSackCarriers.splice(sackIndex, 1);

    }

    saveState();
    renderPage(); // FIXED: שימוש ב-renderPage במקום render
}



/**

 * Starts the timer for a given heat/sprint.

 * Resets arrivals for the target heat/sprint.

 * @param {object} targetHeat - The heat or sprint object to start.

 */

function handleStart(targetHeat) {

    targetHeat.started = true;

    targetHeat.arrivals = []; // Clear previous arrivals

    state.startTime = Date.now(); // Record start time

    startTimer(); // Start the main UI timer

    saveState();

    render();

}



/**

 * Stops the timer for a given heat/sprint.

 * Marks the heat/sprint as finished.

 * @param {object} targetHeat - The heat or sprint object to stop.

 */

function handleStop(targetHeat) {

    clearInterval(state.timer);
    state.isTimerRunning = false;

    targetHeat.finished = true;
    saveState();

    render();

}



/**

 * Handles adding a runner's arrival to the current heat/sprint.

 * Records their finish time and checks if all active runners have arrived.

 * @param {Event} event - The click event from the runner button.

 * @param {object} targetHeat - The current heat or sprint object.

 * @param {number} heatIndex - The index of the current heat (or -1 for crawling sprints).

 */

function handleAddRunnerToHeat(event, targetHeat, heatIndex) {

    // Ensure the clicked element is a runner button

    if (!event.target.matches('.runner-btn')) return;



    const shoulderNumber = parseInt(event.target.dataset.shoulderNumber);

    // Prevent adding if shoulder number is invalid or already arrived in this heat

    if (isNaN(shoulderNumber) || targetHeat.arrivals.some(a => a.shoulderNumber === shoulderNumber)) return;



    const finishTime = Date.now() - state.startTime; // Calculate finish time relative to start

    targetHeat.arrivals.push({ shoulderNumber, finishTime, comment: null, status: 'active' });



    // Determine total active runners to check for heat completion

    const totalActiveRunners = state.runners.filter(runner => !state.crawlingDrills.runnerStatuses[runner.shoulderNumber]).length;



    if (heatIndex !== -1) { // Regular sprint heats

        if (targetHeat.arrivals.length === totalActiveRunners) handleStop(targetHeat);

    } else { // Crawling sprints

        if (targetHeat.arrivals.length === totalActiveRunners) {

            handleStop(targetHeat);

            stopAllSackTimers(); // Stop all sack timers when crawling sprint finishes

        }

    }

    saveState();

    render();

}



/**

 * Updates a comment for a specific runner's arrival in a heat.

 * @param {Event} event - The input event from the comment textarea.

 * @param {object} targetHeat - The heat object containing the arrival.

 */

function updateComment(event, targetHeat) {

    const index = parseInt(event.target.dataset.index);

    if (targetHeat.arrivals[index]) {

        targetHeat.arrivals[index].comment = event.target.value;

        saveState();

    }

}

function appendDNFsToHeat(targetHeat) {
    const activeSNs = state.runners
        .filter(r => r.shoulderNumber && !state.crawlingDrills.runnerStatuses[r.shoulderNumber])
        .map(r => r.shoulderNumber);

    const arrivedSet = new Set((targetHeat.arrivals || []).map(a => a.shoulderNumber));
    const missing = activeSNs.filter(sn => !arrivedSet.has(sn)).sort((a, b) => a - b);

    targetHeat.arrivals = targetHeat.arrivals || [];
    missing.forEach(sn => {
        targetHeat.arrivals.push({
            shoulderNumber: sn,
            finishTime: null,
            comment: 'לא סיים',
            status: 'active'
        });
    });
}

function confirmStopAndAdvance(targetHeat, context) {
    showModal(
        'אישור סיום',
        'לחיצה על "סיים" תפסיק את מדידת הזמן ותעבור למקצה הבא. משתתפים שלא סיימו יסומנו "לא סיים" ויקבלו ציון 1. להמשיך?',
        () => {
            // עצירת הטיימר וסימון סיום
            clearInterval(state.timer);
            state.isTimerRunning = false;
            targetHeat.finished = true;

            // הוספת DNF למי שלא הגיע
            appendDNFsToHeat(targetHeat);

            // שמירה
            saveState();

            // מעבר לפי הקשר
            if (context === 'sprint') {
                if (state.currentHeatIndex < CONFIG.NUM_HEATS - 1) {
                    state.currentHeatIndex++;
                } else {
                    state.currentPage = PAGES.CRAWLING_COMMENTS;
                }
            } else if (context === 'crawling') {
                // בסיום ספרינט זחילות: לעצור כל טיימרי שק
                stopAllSackTimers();
                if (state.crawlingDrills.currentSprintIndex < CONFIG.MAX_CRAWLING_SPRINTS - 1) {
                    state.crawlingDrills.currentSprintIndex++;
                } else {
                    state.currentPage = PAGES.STRETCHER_HEAT;
                    state.sociometricStretcher.currentHeatIndex = 0;
                }
            }

            render();
        }
    );
}
/**

 * Undoes the last runner arrival for the current heat/sprint.

 * @param {object} targetHeat - The heat or sprint object to modify.

 */

function handleUndoArrival(targetHeat) {

    if (targetHeat.arrivals.length > 0) {

        targetHeat.arrivals.pop(); // Remove the last arrival

        saveState();

        render();

    }

}



/**

 * Starts the main heat/sprint timer.

 * Prevents multiple timers from running simultaneously.

 */

function startTimer() {

    if (state.isTimerRunning) return; // Prevent starting if already running

    state.isTimerRunning = true;

    state.timer = setInterval(() => {

        const elapsedTime = Date.now() - state.startTime;

        // Determine whether to show milliseconds based on the current page

        const showMilliseconds = (state.currentPage === PAGES.HEATS);

        updateTimerDisplay(elapsedTime, showMilliseconds);

    }, 71); // V1.1 - Timer interval updated from 10ms to 71ms for performance

}



/**

 * Toggles a runner's status as a sack carrier in crawling drills.

 * Manages starting and stopping individual sack timers.

 * @param {Event} event - The click event from the sack carrier button.

 */

function handleSackCarrierToggle(event) {

    const shoulderNumber = parseInt(event.currentTarget.dataset.shoulderNumber);

    const index = state.crawlingDrills.activeSackCarriers.indexOf(shoulderNumber);

    const sackCarrierData = state.crawlingDrills.sackCarriers[shoulderNumber];



    if (index > -1) {

        // If already selected, deselect and stop timer

        if (sackCarrierData) {

            stopSackTimer(shoulderNumber);

            state.crawlingDrills.activeSackCarriers.splice(index, 1);

        }

    } else if (state.crawlingDrills.activeSackCarriers.length < CONFIG.MAX_SACK_CARRIERS) {

        // If not selected and limit not reached, select and start timer

        state.crawlingDrills.activeSackCarriers.push(shoulderNumber);

        if (!sackCarrierData) {

            // Initialize sack carrier data if first time

            state.crawlingDrills.sackCarriers[shoulderNumber] = { startTime: null, totalTime: 0, timerInterval: null };

        }

        state.crawlingDrills.sackCarriers[shoulderNumber].startTime = Date.now();

        startSackTimer(shoulderNumber);

    }

    saveState();

    render(); // Re-render to update button states

}



/**

 * Stops the individual sack timer for a specific runner.

 * Accumulates the elapsed time into totalTime.

 * @param {number} shoulderNumber - The shoulder number of the runner.

 */

function stopSackTimer(shoulderNumber) {

    const carrierData = state.crawlingDrills.sackCarriers[shoulderNumber];

    if (carrierData && carrierData.startTime) {

        carrierData.totalTime += Date.now() - carrierData.startTime; // Add current duration to total

        carrierData.startTime = null; // Reset start time

        clearInterval(carrierData.timerInterval); // Clear the interval

        carrierData.timerInterval = null;

    }

}



/**

 * Stops all active sack timers.

 * Called when transitioning away from the crawling comments page or when crawling sprint finishes.

 */

function stopAllSackTimers() {

    state.crawlingDrills.activeSackCarriers.forEach(stopSackTimer);

    state.crawlingDrills.activeSackCarriers = []; // Clear the list of active carriers

}



/**

 * Starts the individual sack timer for a specific runner.

 * @param {number} shoulderNumber - The shoulder number of the runner.

 */

function startSackTimer(shoulderNumber) {

    const carrierData = state.crawlingDrills.sackCarriers[shoulderNumber];

    if (!carrierData || carrierData.timerInterval) return; // Prevent starting if already running



    carrierData.timerInterval = setInterval(() => {

        const sackTimerDisplay = document.getElementById(`sack-timer-${shoulderNumber}`);

        if (sackTimerDisplay && carrierData.startTime) {

            // Update display with accumulated total time + current running time

            sackTimerDisplay.textContent = formatTime_no_ms(carrierData.totalTime + (Date.now() - carrierData.startTime));

        }

    }, 100); // Update every 100ms for sack timers

}



/**

 * Calculates the final sprint score for a runner as the average of per-heat relative scores.

 * Winner in a heat gets 7; others are proportional to (fastest / time). Min score per heat is 1.

 * @param {object} runner

 * @returns {number} Average rounded to nearest integer in [1..7]

 */


/**

 * Calculates the crawling sprint score for a given runner.

 * Similar to sprint score, but for crawling sprints.

 * @param {object} runner - The runner object.

 * @returns {number} The normalized crawling sprint score (1-7).

 */


/**

 * Calculates the sack carrying score for a given runner.

 * A longer sack carry time should result in a higher score.

 * @param {object} runner - The runner object.

 * @returns {number} The normalized sack carrying score (1-7).

 */

/**

 * Calculates the overall crawling drills final score for a given runner.

 * This combines sack carrying time and crawling sprint performance.

 * Updated for V1.11: 50% for crawling sprints, 50% for sack carry time.

 * @param {object} runner - The runner object.

 * @returns {number} The rounded average of sack score and crawling sprint score (1-7).

 */

/**

 * Calculates the sociometric final score based on the number of selections.

 * Stretcher carries are weighted higher than jerrican carries.

 * @param {object} runner - The runner object.

 * @returns {number} The normalized score (1-7).

 */

// --- Page Rendering ---

// ADDED: מגדיר את render כפונקציה גלובלית
window.render = renderPage;

/**

 * Main rendering function that clears the content and renders the appropriate page

 * based on the current state.currentPage.

 * Also manages global timer state and navigation tab highlighting.

 */

function renderPage() {
    ensureDomRefs();
    if (!contentDiv) { setTimeout(renderPage, 50); return; }

    const content = document.getElementById('content');
    if (!content) { setTimeout(renderPage, 50); return; }

    content.innerHTML = '';
    const footer = document.getElementById('footer-navigation');
    if (footer) footer.innerHTML = '';

    if (state.timer) clearInterval(state.timer);
    state.isTimerRunning = false;

    if (state.currentPage !== PAGES.CRAWLING_COMMENTS) stopAllSackTimers();

    // Handle quick comments visibility based on current page
    if (state.currentPage === 'runners') {
        document.body.classList.add('hide-quick-comments');
    } else {
        document.body.classList.remove('hide-quick-comments');
    }

    const shouldShowQuickBar =
    state.runners && state.runners.length > 0 &&
    state.currentPage !== PAGES.RUNNERS;

  const quickBarDiv = document.getElementById('quick-comment-bar-container');
  if (quickBarDiv) quickBarDiv.style.display = '';
  window.QuickComments?.renderBar(shouldShowQuickBar);

    // סגנון לטאבים מבוטלים (מוזרק פעם אחת)
    if (!document.getElementById('nav-disabled-style')) {
        const s = document.createElement('style');
        s.id = 'nav-disabled-style';
        s.textContent = `
          .nav-tab.is-disabled { 
            opacity: .5; 
            cursor: not-allowed; 
            pointer-events: none; 
          }
        `;
        document.head.appendChild(s);
    }

    // Update active navigation tab highlighting (modern)
    document.querySelectorAll('.nav-tab').forEach(tab => {
        const isCurrent = tab.dataset.page === state.currentPage;

        // legacy toggles (left intact for compatibility)
        tab.classList.toggle('border-blue-500', isCurrent);
        tab.classList.toggle('text-blue-500', isCurrent);
        tab.classList.toggle('border-transparent', !isCurrent);
        tab.classList.toggle('text-gray-600', !isCurrent);

        // modern active state
        tab.classList.toggle('is-active', isCurrent);
        tab.setAttribute('aria-current', isCurrent ? 'page' : 'false');
    });

    // השבתת טאבים כשאין מתמודדים
    const noRunners = !state.runners || state.runners.length === 0;
    document.querySelectorAll('.nav-tab').forEach(tab => {
        const page = tab.dataset.page;
        const shouldDisable = noRunners && page !== PAGES.RUNNERS;
        tab.classList.toggle('is-disabled', shouldDisable);
        tab.setAttribute('aria-disabled', shouldDisable ? 'true' : 'false');
        tab.style.pointerEvents = shouldDisable ? 'none' : '';
    });

    // Refresh tab structure/styles after toggling
    refreshNavigationTabs();

    // Dynamically update the stretcher page tab label from CONFIG
    const stretcherTab = document.querySelector('.nav-tab[data-page="sociometric-stretcher-heat"] span:last-child');
    if (stretcherTab) {
        stretcherTab.textContent = CONFIG.STRETCHER_PAGE_LABEL;
    }

    if (state.currentPage !== PAGES.STATUS_MANAGEMENT && state.currentPage !== PAGES.ADMIN_SETTINGS) {
        state.lastPage = state.currentPage;
    }

    switch (state.currentPage) {
        case PAGES.RUNNERS: 
            setPageTitle('ניהול קבוצה');
            window.Pages.renderRunnersPage?.(); 
            break;
        case PAGES.ADMIN_SETTINGS: 
            setPageTitle('הגדרות מנהל');
            if (window.Pages?.renderAdminSettingsPage) {
                window.Pages.renderAdminSettingsPage();
            } else {
                console.warn('Admin settings page not ready');
            }
            break;
        case PAGES.STATUS_MANAGEMENT: 
            setPageTitle('ניהול סטטוס');
            window.Pages.renderStatusManagementPage?.(); 
            break;
        case PAGES.HEATS: 
            setPageTitle('ספרינטים');
            window.Pages.renderHeatPage?.(state.currentHeatIndex); 
            break;
        case PAGES.CRAWLING_COMMENTS: 
            setPageTitle('זחילה קבוצתית');
            window.Pages.renderCrawlingDrillsCommentsPage?.(); 
            break;
        case PAGES.CRAWLING_SPRINT: 
            setPageTitle('תחרות זחילות');
            window.Pages.renderCrawlingSprintPage?.(state.crawlingDrills.currentSprintIndex); 
            break;
        case PAGES.STRETCHER_HEAT: 
            setPageTitle('אלונקה סוציומטרית');
            window.Pages.renderSociometricStretcherHeatPage?.(state.sociometricStretcher?.currentHeatIndex || 0); 
            break;
        case PAGES.REPORT: 
            setPageTitle('דוח סיכום');
            window.Pages.renderReportPage?.(); 
            break;
    }
}

// ADDED: פונקציה פשוטה לקביעת כותרת
function setPageTitle(title) {
    if (headerTitle) {
        headerTitle.textContent = title;
    }
}

/**

 * Renders the "Runners" page, allowing management of runner shoulder numbers,

 * evaluator details, and app settings/backup.

 */

/**

 * Renders the "Admin Settings" page, allowing modification of core application configurations.

 * Warns the user that changes will reset all data.

 * @param {Event} event - The change event from the file input.

 */

function showEditBasicDetailsModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50';
    backdrop.id = 'edit-basic-details-modal';

    backdrop.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md mx-4 text-right">
        <h3 class="text-xl font-bold mb-4 text-center text-blue-600 dark:text-blue-400">עריכת פרטי הערכה</h3>
        
        <div class="space-y-4 mb-6">
            <div>
                <label class="block text-right mb-1 text-sm font-medium">שם המעריך:</label>
                <input type="text" id="edit-basic-evaluator-name" value="${state.evaluatorName}" 
                       class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-lg text-right bg-white dark:bg-gray-700 dark:text-white">
            </div>
            <div>
                <label class="block text-right mb-1 text-sm font-medium">מספר קבוצה:</label>
                <input type="text" id="edit-basic-group-number" value="${state.groupNumber}" 
                       class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-lg text-right bg-white dark:bg-gray-700 dark:text-white">
            </div>
        </div>
        
        <div class="flex justify-center gap-4">
            <button id="save-basic-details" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">
                שמור שינויים
            </button>
            <button id="cancel-basic-details" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">
                ביטול
            </button>
        </div>
        
        <div id="basic-edit-error" class="mt-4 text-red-500 text-center text-sm hidden"></div>
    </div>`;

    document.body.appendChild(backdrop);

    document.getElementById('save-basic-details').addEventListener('click', () => {
        const evaluatorName = document.getElementById('edit-basic-evaluator-name').value.trim();
        const groupNumber = document.getElementById('edit-basic-group-number').value.trim();
        const errorDiv = document.getElementById('basic-edit-error');

        if (!evaluatorName || !groupNumber) {
            errorDiv.textContent = 'יש למלא את שם המעריך ומספר הקבוצה';
            errorDiv.classList.remove('hidden');
            return;
        }

        state.evaluatorName = evaluatorName;
        state.groupNumber = groupNumber;
        saveState();

        document.body.removeChild(backdrop);
        renderPage();
    });

    document.getElementById('cancel-basic-details').addEventListener('click', () => {
        document.body.removeChild(backdrop);
    });
}

/**
 * מצב עריכת רצים בתוך העמוד
 */
function showRunnerEditMode() {
    const runnerListDiv = document.getElementById('runner-list');
    const editAreaDiv = document.getElementById('runner-edit-area');
    const editListDiv = document.getElementById('editable-runner-list');

    // הסתר רשימה רגילה והצג אזור עריכה
    runnerListDiv.style.display = 'none';
    editAreaDiv.classList.remove('hidden');

    // יצירת גיבוי למקרה של ביטול
    window.tempRunners = JSON.parse(JSON.stringify(state.runners));

    renderEditableRunnerList();

    // Event listeners
    document.getElementById('add-runner-row').addEventListener('click', addRunnerRow);
    document.getElementById('save-runners-btn').addEventListener('click', saveRunnersEdit);
    document.getElementById('cancel-runners-btn').addEventListener('click', cancelRunnersEdit);
}

function renderEditableRunnerList() {
    const editListDiv = document.getElementById('editable-runner-list');

    editListDiv.innerHTML = state.runners.map((runner, index) => `
        <div class="flex items-center gap-2 p-2 bg-white dark:bg-gray-600 rounded border runner-edit-row" data-index="${index}">
            <span class="w-8 text-center font-medium">${index + 1}.</span>
            <input type="number" class="runner-edit-input flex-1 p-2 border border-gray-300 dark:border-gray-500 rounded text-center bg-white dark:bg-gray-700 dark:text-white" 
                   value="${runner.shoulderNumber}" min="1" max="999" placeholder="מספר כתף">
            <button class="remove-runner-edit bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm" data-index="${index}">
                מחק
            </button>
        </div>
    `).join('');

    // מאזינים למחיקה
    editListDiv.querySelectorAll('.remove-runner-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            state.runners.splice(index, 1);
            renderEditableRunnerList();
        });
    });

    // מאזינים לשינוי ערכים
    editListDiv.querySelectorAll('.runner-edit-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const row = e.target.closest('.runner-edit-row');
            const index = parseInt(row.dataset.index);
            const value = parseInt(e.target.value) || '';
            if (state.runners[index]) {
                state.runners[index].shoulderNumber = value;
            }
        });
    });
}

function addRunnerRow() {
    if (state.runners.length >= CONFIG.MAX_RUNNERS) {
        const errorDiv = document.getElementById('runner-edit-error');
        errorDiv.textContent = `לא ניתן להוסיף יותר מ-${CONFIG.MAX_RUNNERS} מועמדים`;
        errorDiv.classList.remove('hidden');
        return;
    }

    state.runners.push({ shoulderNumber: '' });
    renderEditableRunnerList();

    // Focus על השדה החדש
    setTimeout(() => {
        const newInput = document.querySelector('.runner-edit-row:last-child .runner-edit-input');
        if (newInput) newInput.focus();
    }, 0);
}

function saveRunnersEdit() {
    const errorDiv = document.getElementById('runner-edit-error');
    errorDiv.classList.add('hidden');

    // בדיקת תקינות
    const newRunners = [];
    const usedNumbers = new Set();

    for (const runner of state.runners) {
        const shoulderNumber = parseInt(runner.shoulderNumber);

        if (!shoulderNumber || shoulderNumber <= 0) {
            errorDiv.textContent = 'כל מספרי הכתף חייבים להיות מספרים חיוביים';
            errorDiv.classList.remove('hidden');
            return;
        }

        if (usedNumbers.has(shoulderNumber)) {
            errorDiv.textContent = 'נמצאו מספרי כתף כפולים';
            errorDiv.classList.remove('hidden');
            return;
        }

        usedNumbers.add(shoulderNumber);
        newRunners.push({ shoulderNumber });
    }

    // שמירה וסיום עריכה
    state.runners = newRunners.sort((a, b) => a.shoulderNumber - b.shoulderNumber);
    saveState();
    exitRunnerEditMode();
}

function cancelRunnersEdit() {
    // שחזור מהגיבוי
    if (window.tempRunners) {
        state.runners = window.tempRunners;
        delete window.tempRunners;
    }
    exitRunnerEditMode();
}

function exitRunnerEditMode() {
    const runnerListDiv = document.getElementById('runner-list');
    const editAreaDiv = document.getElementById('runner-edit-area');

    // הצג רשימה רגילה והסתר אזור עריכה
    runnerListDiv.style.display = '';
    editAreaDiv.classList.add('hidden');

    // עדכן רשימה
    renderRunnerList();
}



/**

 * Initializes the application by setting up navigation, loading state,

 * performing initial render, and starting the autosave timer.

 */

async function init() {
    try { if ('wakeLock' in navigator) { /* no-op */ }} catch { /* Handle error if needed */ }

    // מאזין ניווט ראשי עם מניעת ברירת מחדל ועצירת טאבים מושבתים
    const navEl = document.querySelector('nav');
    if (navEl) {
        navEl.addEventListener('click', (e) => {
            const tab = e.target.closest('.nav-tab');
            if (!tab) return;
            e.preventDefault(); // מונע קפיצה/רענון של <a>

            // אל תלחץ אם מושבת
            if (tab.classList.contains('is-disabled') || tab.getAttribute('aria-disabled') === 'true') return;

            const nextPage = tab.dataset.page;
            
            // NEW: בדיקה אם יש מקצה פעיל שלא הסתיים
            if (state.currentPage === PAGES.HEATS && nextPage !== PAGES.HEATS) {
                const currentHeat = state.heats[state.currentHeatIndex];
                if (currentHeat && currentHeat.started && !currentHeat.finished) {
                    showModal('מקצה פעיל', 'יש לסיים את המקצה הנוכחי לפני המעבר לעמוד אחר. לחץ על "סיים" כדי לסיים את המקצה.');
                    return;
                }
            }
            
            // NEW: בדיקה לספרינטי זחילה
            if (state.currentPage === PAGES.CRAWLING_SPRINT && nextPage !== PAGES.CRAWLING_SPRINT) {
                const currentSprint = state.crawlingDrills?.sprints?.[state.crawlingDrills.currentSprintIndex];
                if (currentSprint && currentSprint.started && !currentSprint.finished) {
                    showModal('ספרינט זחילה פעיל', 'יש לסיים את ספרינט הזחילה הנוכחי לפני המעבר לעמוד אחר. לחץ על "סיים" כדי לסיים את הספרינט.');
                    return;
                }
            }
            
            const noRunners = !state.runners || state.runners.length === 0;
            // הגנה כפולה: לא לעבור למסכים הדורשים רצים
            const needsRunners = new Set([PAGES.HEATS, PAGES.CRAWLING_COMMENTS, PAGES.CRAWLING_SPRINT, PAGES.STRETCHER_HEAT, PAGES.REPORT]);
            if (noRunners && needsRunners.has(nextPage)) return;

            const go = () => { state.currentPage = nextPage; saveState(); renderPage(); };
            const intercepted = window.confirmLeaveCrawlingComments?.(go);
            if (!intercepted) go();
        });
    }

    // כפתור Theme
    document.getElementById('theme-toggle-btn')?.addEventListener('click', () => {
        const modes = ['auto', 'light', 'dark'];
        const i = Math.max(0, modes.indexOf(state.themeMode));
        state.themeMode = modes[(i + 1) % modes.length];
        applyTheme();
        saveState();
        renderPage();
    });

    window.PWA?.setup();

    loadState();
    applyTheme();
    setupPWAInstallUI(); // FIX: was never called
    renderPage();
    setInterval(saveState, 60000);
}

// RESTORED: Theme application helper (was missing causing ReferenceError)
function applyTheme() {
    try {
        const root = document.documentElement;
        const mode = state.themeMode || 'auto';
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const resolved = (mode === 'auto') ? (prefersDark ? 'dark' : 'light') : mode;

        if (resolved === 'dark') root.classList.add('dark'); else root.classList.remove('dark');

        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) {
            if (mode === 'auto') themeIcon.textContent = '🌓';
            else if (resolved === 'dark') themeIcon.textContent = '☀️';
            else themeIcon.textContent = '🌙';
            themeIcon.title = mode === 'auto'
                ? 'מצב אוטומטי'
                : (resolved === 'dark' ? 'מצב כהה' : 'מצב בהיר');
        }
    } catch (e) {
        console.warn('applyTheme failed', e);
    }
}

// Attach listener once for auto mode changes
(function attachThemeMediaListener(){
    if (window._themeMediaListenerAttached) return;
    if (window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener?.('change', () => {
            if (state.themeMode === 'auto') applyTheme();
        });
    }
    window._themeMediaListenerAttached = true;
})();

window.Pages.renderRunnersPage ??= renderRunnersPage;
window.Pages.renderAdminSettingsPage ??= renderAdminSettingsPage;
window.Pages.renderStatusManagementPage ??= renderStatusManagementPage;
window.Pages.renderHeatPage ??= renderHeatPage;
window.Pages.renderCrawlingDrillsCommentsPage ??= renderCrawlingDrillsCommentsPage;
window.Pages.renderCrawlingSprintPage ??= renderCrawlingSprintPage;
window.Pages.renderReportPage ??= renderReportPage;
// Only bind stretcher page if it’s defined in this file
if (typeof renderSociometricStretcherHeatPage === 'function') {
    window.Pages.renderSociometricStretcherHeatPage ??= renderSociometricStretcherHeatPage;
}

// Initialize the application when the script loads
// init(); // הוסר – נקרא לאחר ש-DOM נטען
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => { 
        ensureDomRefs(); 
        init(); 

        // --- הוספת הקריאה החדשה ---
        // אחרי שכל האפליקציה מוכנה, חבר את המאזינים של דף הדוחות
        if (window.Pages && typeof window.Pages.initReportPageListeners === 'function') {
            window.Pages.initReportPageListeners();
        }
        // -------------------------
    });
} else {
    ensureDomRefs();
    init();
}

// ADDED: restore missing generateRandomRunners used by showAddRunnersModal
function generateRandomRunners(count) {
    try {
        const existing = new Set(state.runners.map(r => r.shoulderNumber));
        const maxAddable = Math.max(0, CONFIG.MAX_RUNNERS - existing.size);
        const toAdd = Math.min(maxAddable, count || maxAddable);
        if (toAdd <= 0) return;

        // Build pool of free numbers
        const pool = [];
        for (let n = 1; n <= 999; n++) {
            if (!existing.has(n)) pool.push(n);
        }
        // Fisher–Yates shuffle (partial)
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.random() * (i + 1) | 0;
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const selected = pool.slice(0, toAdd).map(n => ({ shoulderNumber: n }));
        state.runners = state.runners.concat(selected).sort((a, b) => a.shoulderNumber - b.shoulderNumber);
        saveState();
    } catch(e) {
        console.warn('generateRandomRunners failed', e);
    }
}