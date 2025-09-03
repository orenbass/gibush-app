if ("serviceWorker" in navigator) {
    // Use root path so scope covers the whole app
    navigator.serviceWorker.register("/service-worker.js").catch(console.error);
}



// --- Global State ---

// אובייקט מצב מרכזי המכיל את כל נתוני האפליקציה.

// המצב הזה נשמר ונטען מ-localStorage.

const state = {

    currentPage: PAGES.RUNNERS, // הדף הפעיל הנוכחי

    lastPage: PAGES.RUNNERS,    // מאחסן את הדף האחרון שבו ביקרנו לפני סטטוס/הגדרות מנהל

    runners: [],         // מערך של אובייקטי רצים { shoulderNumber: number }

    heats: [],           // מערך של אובייקטי מקצי ספרינט

    currentHeatIndex: 0,     // אינדקס המקצה הנוכחי המוצג

    timer: null,             // מזהה מרווח (Interval ID) לטיימר הראשי

    startTime: 0,            // חותמת זמן של התחלת המקצה/ספרינט הנוכחי

    isTimerRunning: false,       // דגל המציין אם הטיימר הראשי פעיל

    evaluatorName: '',   // שם המעריך

    groupNumber: '',         // מספר הקבוצה

    crawlingDrills: {},      // אובייקט לנתוני תרגילי זחילה (הערות, ספרינטים, נושאי שק)

    generalComments: {}, // הוספת שדה להערות כלליות

    sociometricStretcher: {},    // אובייקט לנתוני אלונקה סוציומטרית (מקצים, נושאים, הערות)

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
let tempStateBackup = null; // גיבוי זמני למצב עריכה בדוח

// Ensure a global page registry exists for external page modules
window.Pages = window.Pages || {};

// עזר: לוודא שהפניות ל-DOM קיימות (במיוחד אם הסקריפט רץ לפני טעינת ה-DOM)
function ensureDomRefs() {
    if (!contentDiv) contentDiv = document.getElementById('content');
    if (!headerTitle) headerTitle = document.getElementById('header-title');
    if (!autosaveStatus) autosaveStatus = document.getElementById('autosave-status');
    if (!loadingOverlay) loadingOverlay = document.getElementById('loading-overlay');
}

// --- Utility functions moved to utils ---
// Moved to js/utils/time.js: formatTime, formatTime_no_ms, updateTimerDisplay
// Moved to js/utils/modal.js: showModal, confirmLeaveCrawlingComments
// Moved to js/utils/scoring.js: normalizeScore, computeHeatResults, get*Results, calculate*Score

function setupPWAInstallUI() {
    const installBtn = document.getElementById('install-btn');
    if (!installBtn) return;

    const isApple = /iP(hone|ad|od)|Mac/i.test(navigator.userAgent);
    // iOS doesn’t support beforeinstallprompt – hide the button there
    installBtn.style.display = isApple ? 'none' : 'none';

    installBtn.addEventListener('click', async () => {
        if (!deferredInstallPrompt) {
            showModal('התקנה', 'לא ניתן להתקין כעת. ודא שעמוד נטען דרך HTTPS ונסה מאוחר יותר.');
            return;
        }
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice.catch(() => {});
        deferredInstallPrompt = null;
        installBtn.style.display = 'none';
    });
}

window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    const installBtn = document.getElementById('install-btn');
    if (installBtn) installBtn.style.display = 'inline-flex';
});

window.addEventListener('appinstalled', () => {
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
    render();
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

                render(); // Re-render the UI

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

    render();

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



/**

 * Main rendering function that clears the content and renders the appropriate page

 * based on the current state.currentPage.

 * Also manages global timer state and navigation tab highlighting.

 */

function render() {

    ensureDomRefs();
    if (!contentDiv) { setTimeout(render, 50); return; }

    const content = document.getElementById('content');
    if (!content) { setTimeout(render, 50); return; }

    content.innerHTML = '';
    const footer = document.getElementById('footer-navigation');
    if (footer) footer.innerHTML = '';

    if (state.timer) clearInterval(state.timer);
    state.isTimerRunning = false;

    if (state.currentPage !== PAGES.CRAWLING_COMMENTS) stopAllSackTimers();

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
        case PAGES.RUNNERS: window.Pages.renderRunnersPage?.(); break;
        case PAGES.ADMIN_SETTINGS: window.Pages.renderAdminSettingsPage?.(); break;
        case PAGES.STATUS_MANAGEMENT: window.Pages.renderStatusManagementPage?.(); break;
        case PAGES.HEATS: window.Pages.renderHeatPage?.(state.currentHeatIndex); break;
        case PAGES.CRAWLING_COMMENTS: window.Pages.renderCrawlingDrillsCommentsPage?.(); break;
        case PAGES.CRAWLING_SPRINT: window.Pages.renderCrawlingSprintPage?.(state.crawlingDrills.currentSprintIndex); break;
        case PAGES.STRETCHER_HEAT: window.Pages.renderSociometricStretcherHeatPage?.(state.sociometricStretcher.currentHeatIndex); break;
        case PAGES.REPORT: window.Pages.renderReportPage?.(); break;
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
        render();
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

 * Renders the "Status Management" page, allowing global status changes for runners

 * Runners can be marked as 'temp_removed' (temporarily removed) or 'retired' (permanently retired).

 */

/**

 * Renders a specific sprint heat page, including timer, runner arrival buttons,

 * and a list of arrived runners with their times and comments.

 * @param {number} heatIndex - The index of the heat to render.

 */
/**

 * Renders the "Crawling Drills Comments" page, allowing general comments for runners

 * and managing sack carriers with their individual timers.

 */
/**

 * Renders a specific crawling sprint page, similar to sprint heats but for crawling.

 * Includes timer, runner arrival buttons, and a list of arrived runners.

 * @param {number} sprintIndex - The index of the crawling sprint to render.

 */

/**

 * Renders the "Report" page, displaying summary tables for active and inactive runners,

 * including their calculated scores and status. Provides an option to export data to Excel.

 */

// --- Excel Export (Version 1.11 - תיקון באג) ---



/**

 * מייצא את כל נתוני האפליקציה לקובץ אקסל עם מספר גיליונות.

 * משתמש בספריית ExcelJS ליצירת קובץ אקסל אמין.

 */

async function exportToExcel() {

    // הצגת מסך טעינה בזמן שהקובץ נוצר

    loadingOverlay.classList.remove('hidden');



    try {

        const workbook = new ExcelJS.Workbook();

        workbook.creator = 'SprintApp_v1.11';

        workbook.created = new Date();



        // הגדרת סגנון גבולות משותף לתאים

        const border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };



        // פונקציית עזר לעיצוב שורות כותרת

        const styleHeader = (row) => {

            row.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }; // גופן לבן ומודגש

            row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }; // רקע כחול

            row.eachCell(cell => { cell.border = border; }); // החלת גבולות על כל תא

        };



        // --- 1. גיליון סיכום כללי ---

        const summarySheet = workbook.addWorksheet('סיכום כללי');

        summarySheet.views = [{ rightToLeft: true }]; // הגדרת כיוון הגיליון ל-RTL



        // הוספת מידע כללי

        summarySheet.addRow(['שם המעריך:', state.evaluatorName]);

        summarySheet.addRow(['מספר קבוצה:', state.groupNumber]);

        summarySheet.addRow(['תאריך ושעה:', new Date().toLocaleString('he-IL')]);

        summarySheet.addRow([]); // שורה ריקה לרווח

        summarySheet.addRow(['טבלת סיכום ציונים']).font = { bold: true, size: 14 }; // כותרת המקטע



        // הוספת כותרת לטבלת הסיכום

        const summaryHeader = summarySheet.addRow([
            'דירוג',
            "מס' כתף",
            'סופי ספרינטים (1-7)',
            'סופי זחילות (1-7)',
            `סופי ${CONFIG.STRETCHER_PAGE_LABEL} (1-7)`,
            'הערות כלליות',
            'שם מעריך',
            'מספר קבוצה'
        ]);
        styleHeader(summaryHeader); // החלת סגנונות כותרת



        // הכנת נתוני רצים פעילים לטבלת הסיכום

        const activeRunners = state.runners.filter(r => !state.crawlingDrills.runnerStatuses[r.shoulderNumber])

            .map(runner => {

                const manual = state.manualScores[runner.shoulderNumber];

                const sprintScore = manual?.sprint ?? calculateSprintFinalScore(runner);

                const crawlingScore = manual?.crawl ?? calculateCrawlingFinalScore(runner);

                const stretcherScore = manual?.stretcher ?? calculateStretcherFinalScore(runner);

                return {

                    runner,

                    sprintScore,

                    crawlingScore,

                    stretcherScore,

                    totalScore: sprintScore + crawlingScore + stretcherScore

                };

            })

            .sort((a, b) => b.totalScore - a.totalScore); // מיון לפי ציון כולל בסדר יורד



        // הוספת נתוני רצים פעילים לטבלת הסיכום

        activeRunners.forEach((r, index) => {
            const manual = state.manualScores[r.runner.shoulderNumber];
            const sprintScore = manual?.sprint ?? calculateSprintFinalScore(r.runner);
            const crawlingScore = manual?.crawl ?? calculateCrawlingFinalScore(r.runner);
            const stretcherScore = manual?.stretcher ?? calculateStretcherFinalScore(r.runner);

            // הערות
            const generalComments = state.generalComments[r.runner.shoulderNumber] || '';

            const row = summarySheet.addRow([
                index + 1,
                r.runner.shoulderNumber,
                sprintScore,
                crawlingScore,
                stretcherScore,
                generalComments,
                state.evaluatorName,
                state.groupNumber
            ]);
            row.eachCell((cell) => {
                cell.border = border;
                if (index % 2 !== 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; // צבע שורה מתחלף
            });
        });

        summarySheet.columns = [{ width: 10 }, { width: 15 }, { width: 25 }, { width: 25 }, { width: 25 }]; // הגדרת רוחב עמודות



        // הוספת טבלת רצים לא פעילים אם קיימים

        const inactiveRunners = state.runners.filter(r => state.crawlingDrills.runnerStatuses[r.shoulderNumber]);

        if (inactiveRunners.length > 0) {

            summarySheet.addRow([]); // שורה ריקה לרווח

            summarySheet.addRow(["מס' כתף שאינם פעילים"]).font = { bold: true, size: 14 }; // כותרת מקטע

            const inactiveHeader = summarySheet.addRow(["מס' כתף", "סטטוס"]);

            styleHeader(inactiveHeader); // החלת סגנונות כותרת

            inactiveRunners.forEach((runner, index) => {

                const status = state.crawlingDrills.runnerStatuses[runner.shoulderNumber];

                const statusText = status === 'retired' ? 'פרש' : 'גריעה זמנית';

                const row = summarySheet.addRow([runner.shoulderNumber, statusText]);

                row.eachCell((cell) => {

                    cell.border = border;

                    if (index % 2 !== 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };

                });

            });

        }

        // --- 2. גיליון ספרינטים ---
        const sprintsSheet = workbook.addWorksheet('ספרינטים');
        sprintsSheet.views = [{ rightToLeft: true }];

        // טבלת סיכום ממוצעי ציונים לכל רץ
        sprintsSheet.addRow(['ממוצע ציוני ספרינטים']).font = { bold: true, size: 14 };
        sprintsSheet.addRow([]);
        const sprintsSummaryHeader = sprintsSheet.addRow(["מס' כתף", "ממוצע ציון (1-7)"]);
        styleHeader(sprintsSummaryHeader);

        // ממוצעי ציונים
        state.runners
            .slice()
            .sort((a, b) => a.shoulderNumber - b.shoulderNumber)
            .forEach((runner, index) => {
                const avgScore = state.crawlingDrills.runnerStatuses[runner.shoulderNumber] ? 'לא פעיל' : calculateSprintFinalScore(runner);
                const row = sprintsSheet.addRow([runner.shoulderNumber, avgScore]);
                row.eachCell((cell) => {
                    cell.border = border;
                    if (index % 2 !== 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
                });
            });

        sprintsSheet.addRow([]); // רווח

        // פירוט לכל מקצה: דירוג, זמן, ציון, הערה
        for (let i = 0; i < state.heats.length; i++) {
            const heat = state.heats[i];

            sprintsSheet.addRow([`מקצה ספרינט ${i + 1}`]).font = { bold: true, size: 12 };
            const heatHeader = sprintsSheet.addRow(['דירוג', "מס' כתף", 'זמן', 'ציון (1-7)', 'הערה']);
            styleHeader(heatHeader);

            // חישוב תוצאות המקצה לפי היחס למנצח
            const results = getSprintHeatResults(heat);

            results.forEach((r, idx) => {
                const timeTxt = (typeof r.finishTime === 'number' && r.finishTime > 0) ? formatTime(r.finishTime) : 'לא סיים';
                const row = sprintsSheet.addRow([r.rank, r.shoulderNumber, timeTxt, r.score, r.comment || '']);
                row.eachCell((cell) => {
                    cell.border = border;
                    if (idx % 2 !== 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                });
            });

            sprintsSheet.addRow([]); // רווח בין מקצים
        }

        // רוחב עמודות
        sprintsSheet.columns = [{ width: 10 }, { width: 15 }, { width: 18 }, { width: 14 }, { width: 40 }];

        // --- 3. גיליון סיכום זחילות ---

        const crawlingSheet = workbook.addWorksheet('סיכום זחילות');

        crawlingSheet.views = [{ rightToLeft: true }];

        crawlingSheet.addRow(['טבלת סיכום זחילות']).font = { bold: true, size: 14 };

        crawlingSheet.addRow([]);

        const crawlingHeader1 = crawlingSheet.addRow(["מס' כתף", "זמן נשיאת שק כולל", "הערה כללית"]);

        styleHeader(crawlingHeader1);

        state.runners.forEach((runner, index) => {

            const sackData = state.crawlingDrills.sackCarriers[runner.shoulderNumber];
            const sackTimeMs = sackData ? (sackData.totalTime + (sackData.startTime ? Date.now() - sackData.startTime : 0)) : 0;
            const sackTime = formatTime_no_ms(sackTimeMs);
            const comment = state.crawlingDrills.comments[runner.shoulderNumber] || '';
            const row = crawlingSheet.addRow([runner.shoulderNumber, sackTime, comment]);

            row.eachCell((cell) => {

                cell.border = border;

                if (index % 2 !== 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };

            });

        });

        crawlingSheet.columns = [{ width: 15 }, { width: 25 }, { width: 80 }];

        crawlingSheet.addRow([]);

        crawlingSheet.addRow(['טבלת סיכום ספרינט זחילות']).font = { bold: true, size: 14 };

        crawlingSheet.addRow([]);

        const crawlingHeader2 = crawlingSheet.addRow(["מס' כתף", "דירוג ממוצע (1-7)"]);

        crawlingSheet.addRow([]);
        for (let i = 0; i < state.crawlingDrills.sprints.length; i++) {
            const sprint = state.crawlingDrills.sprints[i];
            crawlingSheet.addRow([`מקצה ספרינט זחילות ${i + 1}`]).font = { bold: true, size: 12 };
            const heatHeader = crawlingSheet.addRow(['דירוג', "מס' כתף", 'זמן', 'ציון (1-7)', 'הערה']);
            styleHeader(heatHeader);
            const results = getCrawlingSprintHeatResults(sprint);
            results.forEach((r, idx) => {
                const timeTxt = (typeof r.finishTime === 'number' && r.finishTime > 0) ? formatTime(r.finishTime) : 'לא סיים';
                const row = crawlingSheet.addRow([r.rank, r.shoulderNumber, timeTxt, r.score, r.comment || '']);
                row.eachCell((cell) => {
                    cell.border = border;
                    if (idx % 2 !== 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                });
            });

            crawlingSheet.addRow([]);
        }

        styleHeader(crawlingHeader2);

        state.runners.forEach((runner, index) => {

            const score = state.crawlingDrills.runnerStatuses[runner.shoulderNumber] ? 'לא פעיל' : getCrawlingSprintScore(runner);

            const row = crawlingSheet.addRow([runner.shoulderNumber, score]);

            row.eachCell((cell) => {

                cell.border = border;

                if (index % 2 !== 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };

            });

        });



        // --- 4. גיליון אלונקה סוציומטרית ---

        const stretcherSheet = workbook.addWorksheet(CONFIG.STRETCHER_PAGE_LABEL);
        stretcherSheet.views = [{ rightToLeft: true }];
        stretcherSheet.addRow([`טבלת סיכום ${CONFIG.STRETCHER_PAGE_LABEL}`]).font = { bold: true, size: 14 };
        stretcherSheet.addRow([]);

        const stretcherHeader = stretcherSheet.addRow(["מס' כתף", `מס' פעמים ${CONFIG.STRETCHER_PAGE_LABEL}`, "מס' פעמים ג'ריקן", "ציון (1-7)"]); // עדכון כותרת
        styleHeader(stretcherHeader);

        state.runners.forEach((runner, index) => {
            const score = state.crawlingDrills.runnerStatuses[runner.shoulderNumber] ? 'לא פעיל' : calculateStretcherFinalScore(runner);
            const stretcherCount = state.sociometricStretcher.heats.filter(h => h.selections && h.selections[runner.shoulderNumber] === 'stretcher').length;
            const jerricanCount = state.sociometricStretcher.heats.filter(h => h.selections && h.selections[runner.shoulderNumber] === 'jerrican').length;

            const row = stretcherSheet.addRow([runner.shoulderNumber, stretcherCount, jerricanCount, score]);
            row.eachCell((cell) => {
                cell.border = border;
                if (index % 2 !== 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
            });
        });
        stretcherSheet.columns = [{ width: 15 }, { width: 22 }, { width: 22 }, { width: 16 }];

        // פירוט לכל מקצה: מי נבחר ובאיזה תפקיד
        stretcherSheet.addRow([]);
        stretcherSheet.addRow([`פירוט בחירות לפי מקצה`]).font = { bold: true, size: 14 };
        stretcherSheet.addRow([]);

        for (let i = 0; i < state.sociometricStretcher.heats.length; i++) {
            const heat = state.sociometricStretcher.heats[i];
            stretcherSheet.addRow([`${CONFIG.STRETCHER_PAGE_LABEL} ${i + 1}`]).font = { bold: true, size: 12 };
            const detailHeader = stretcherSheet.addRow(["מס' כתף", 'תפקיד']);
            styleHeader(detailHeader);

            const entries = Object.entries(heat.selections || {})
                .map(([shoulder, type]) => ({ shoulder: parseInt(shoulder), type }))
                .sort((a, b) => a.shoulder - b.shoulder);

            entries.forEach((e, idx) => {
                const row = stretcherSheet.addRow([e.shoulder, e.type === 'stretcher' ? CONFIG.STRETCHER_PAGE_LABEL : "ג'ריקן"]);
                row.eachCell((cell) => {
                    cell.border = border;
                    if (idx % 2 !== 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                });
            });

            stretcherSheet.addRow([]);
        }
        // --- 5. גיליון נתוני הגעה גולמיים ---

        const rawDataSheet = workbook.addWorksheet('נתוני הגעה גולמיים');

        rawDataSheet.views = [{ rightToLeft: true }];

        rawDataSheet.addRow(['נתוני הגעה גולמיים']).font = { bold: true, size: 14 };



        // הוספת נתונים גולמיים ממקצי ספרינט

        state.heats.forEach((heat, index) => {

            rawDataSheet.addRow([]);

            const heatHeader = rawDataSheet.addRow([`מקצה ספרינט ${index + 1}`]);

            heatHeader.font = { bold: true };

            const dataHeader = rawDataSheet.addRow(['דירוג', 'מס\' כתף', 'זמן', 'הערה']);

            styleHeader(dataHeader);

            heat.arrivals.forEach((arrival, rank) => {

                rawDataSheet.addRow([rank + 1, arrival.shoulderNumber, arrival.finishTime ? formatTime(arrival.finishTime) : arrival.comment, arrival.comment || '']);

            });

        });



        // הוספת נתונים גולמיים ממקצי זחילות

        state.crawlingDrills.sprints.forEach((sprint, index) => {

            rawDataSheet.addRow([]);

            const heatHeader = rawDataSheet.addRow([`מקצה זחילה ${index + 1}`]);

            heatHeader.font = { bold: true };

            const dataHeader = rawDataSheet.addRow(['דירוג', 'מס\' כתף', 'זמן', 'הערה']);

            styleHeader(dataHeader);

            sprint.arrivals.forEach((arrival, rank) => {

                rawDataSheet.addRow([rank + 1, arrival.shoulderNumber, arrival.finishTime ? formatTime(arrival.finishTime) : arrival.comment, arrival.comment || '']);

            });

        });



        // --- יצירת קובץ והורדה ---

        const buffer = await workbook.xlsx.writeBuffer(); // קבלת החוברת כבופר

        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        const link = document.createElement('a');

        link.href = URL.createObjectURL(blob);

        // הגדרת שם הקובץ עם מספר הקבוצה והתאריך

        link.download = `SprintReport_v1.11_${state.groupNumber || 'group'}_${new Date().toLocaleDateString('he-IL').replace(/\./g, '-')}.xlsx`;

        link.click(); // הפעלת ההורדה

    } catch (e) {

        console.error("Failed to create Excel file", e);

        showModal('שגיאת ייצוא', `שגיאה ביצירת קובץ האקסל: ${e.message}. אנא נסה שוב.`);

    } finally {

        // הסתרת מסך הטעינה בסיום התהליך

        loadingOverlay.classList.add('hidden');

    }

}



// --- App Initialization ---



/**

 * V1.1 - Applies the current theme (dark/light) to the UI.

 */

function applyTheme() {
    let theme;
    if (state.themeMode === 'auto') {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
        theme = state.themeMode;
    }
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    // עידכון אייקון
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        if (state.themeMode === 'auto') themeIcon.textContent = '🌓'; // סמל למצבי אוטומט
        else if (theme === 'dark') themeIcon.textContent = '☀️';
        else themeIcon.textContent = '🌙';
        themeIcon.title = state.themeMode === 'auto' ? 'מצב אוטומטי' : (theme === 'dark' ? 'מצב כהה' : 'מצב בהיר');
    }
}



/**

 * Initializes the application by setting up navigation, loading state,

 * performing initial render, and starting the autosave timer.

 */

async function init() {
    try { if ('wakeLock' in navigator) { /* no-op */ } } catch {}

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
            const noRunners = !state.runners || state.runners.length === 0;
            // הגנה כפולה: לא לעבור למסכים הדורשים רצים
            const needsRunners = new Set([PAGES.HEATS, PAGES.CRAWLING_COMMENTS, PAGES.CRAWLING_SPRINT, PAGES.STRETCHER_HEAT, PAGES.REPORT]);
            if (noRunners && needsRunners.has(nextPage)) return;

            const go = () => { state.currentPage = nextPage; saveState(); render(); };
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
        render();
    });

    window.PWA?.setup();

    loadState();
    applyTheme();
    render();
    setInterval(saveState, 60000);
}

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
    window.addEventListener('DOMContentLoaded', () => { ensureDomRefs(); init(); });
} else {
    ensureDomRefs();
    init();
}

// --- Sociometric Stretcher Logic (New Counting System) ---

/**
 * Renders the sociometric selection page with a grid of runner cards.
 * Each card allows a one-time selection for stretcher or jerrican per heat.
 * @param {number} heatIndex - The index of the heat to render.
 */

/**
 * כפתור צף (FAB) ו"חלון" תגובה מהירה עם צבעים ברורים
 */

/**
 * Handles a runner selection for stretcher or jerrican based on the new counting rules.
 * @param {number} shoulderNumber - The shoulder number of the runner.
 * @param {string} type - The type of selection ('stretcher' or 'jerrican').
 * @param {number} heatIndex - The index of the current heat.
 */
function handleSociometricSelection(shoulderNumber, type, heatIndex) {
    const heat = state.sociometricStretcher.heats[heatIndex];
    if (!heat.selections) heat.selections = {};

    const current = heat.selections[shoulderNumber];

    // חישוב ספירות נוכחיות
    const counts = Object.values(heat.selections).reduce((acc, v) => {
        if (v === 'stretcher') acc.stretcher++;
        else if (v === 'jerrican') acc.jerrican++;
        return acc;
    }, { stretcher: 0, jerrican: 0 });

    const maxForType = type === 'stretcher' ? CONFIG.MAX_STRETCHER_CARRIERS : CONFIG.MAX_JERRICAN_CARRIERS;
    const curForType = type === 'stretcher' ? counts.stretcher : counts.jerrican;

    if (current === type) {
        // ביטול בחירה – לא “שורף” כלום
        delete heat.selections[shoulderNumber];
    } else if (!current) {
        // בחירה חדשה
        if (curForType >= maxForType) {
            showModal('מגבלה הושגה', `לא ניתן לבחור יותר מ-${maxForType} ${type === 'stretcher' ? 'נושאי אלונקה' : "נושאי ג'ריקן"} במקצה זה.`);
            return;
        }
        heat.selections[shoulderNumber] = type;
    } else {
        // מעבר מסוג אחד לאחר – בדיקת מכסה לסוג היעד
        if (curForType >= maxForType) {
            showModal('מגבלה הושגה', `לא ניתן לבחור יותר מ-${maxForType} ${type === 'stretcher' ? 'נושאי אלונקה' : "נושאי ג'ריקן"} במקצה זה.`);
            return;
        }
        heat.selections[shoulderNumber] = type;
    }

    saveState();
    render();
}

// --- Runner Management & Backup/Restore ---

/**
 * יוצר מועמדים רנדומליים וממלא עד התקרה (CONFIG.MAX_RUNNERS) ללא כפילויות.
 * @param {number} [count] - כמות להוספה. אם לא צוינה, ימולא עד התקרה.
 */
function generateRandomRunners(count) {
    const used = new Set(state.runners.map(r => r.shoulderNumber));
    const remaining = Math.max(0, CONFIG.MAX_RUNNERS - used.size);
    const target = Math.min(remaining, count || remaining);
    if (target <= 0) return;

    // מאגר מספרים פנוי 1..999
    const pool = [];
    for (let i = 1; i <= 999; i++) {
        if (!used.has(i)) pool.push(i);
    }
    // ערבול מהיר (Fisher–Yates)
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const selected = pool.slice(0, target).map(n => ({ shoulderNumber: n }));

    state.runners = state.runners.concat(selected).sort((a, b) => a.shoulderNumber - b.shoulderNumber);
    saveState();
}

/**
 * Helper: compute results for a single heat/sprint.
 * - Finishers sorted by time asc; DNFs follow in original order.
 * - Scores: winner = 7; others = round(7 * fastest/time). DNFs = 1.
 */

/**
 * Returns per-heat sprint results with rank and score.
 * @param {{arrivals:Array}} heat
 * @returns {Array<{rank:number, shoulderNumber:number, finishTime:number|null, score:number, comment:string|null}>}
 */


/**
 * Returns per-heat crawling sprint results with rank and score.
 * @param {{arrivals:Array}} sprint
 * @returns {Array<{rank:number, shoulderNumber:number, finishTime:number|null, score:number, comment:string|null}>}
 */

// חשיפת פונקציות עבור quick-comments.js
window.saveState = saveState;
window.render = render;