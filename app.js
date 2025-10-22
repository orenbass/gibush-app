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

    isTimerRunning: false,       // דגל המציין if הטיימר הראשי פעיל

    evaluatorName: '',   // שם המעריך

    groupNumber: '',         // מספר הקבוצה

    // NEW: מצב נעילת מקצים - מונע עריכת מתמודדים ומעבר בין עמודים
    competitionStarted: false, // הif לחצו על "התחל מקצים"

    crawlingDrills: {},      // אובייקט לנתוני תרגילי זחילה (הערות, ספרינטים, נושאי שק)

    generalComments: {}, // הוספת שדה להערות כלליות

    quickComments: {},    // { shoulderNumber: [ 'tag1', 'tag2', ... ] }

    sociometricStretcher: {},    // אובייקט לנתוני אלונקה סוציומטרית (מקצים, נושאים, הערות)

    themeMode: 'auto', // אפשרויות: 'auto', 'light', 'dark'

    manualScores: {},

    isEditingScores: false, // מצב עריכה

    // === שליחה אוטומטית של גיבוי ===
    autoBackupUpload: {
        isActive: false,           // הif השליחה האוטומטית פעילה
        intervalId: null,          // מזהה ה-interval
        startTime: null,           // זמן התחלת השליחה האוטומטית
        lastUploadTime: null,      // זמן השליחה האחרונה
        uploadCount: 0,            // מספר השליחות שבוצעו
        hasBeenManuallyStopped: false  // הif הופסקה ידנית (לחיצה על "שלח קובץ למנהל")
    }

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

// עזר: לוודא שהפניות ל-DOM קיימות (במיוחד if הסקריפט רץ לפני טעינת ה-DOM)
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
        console.log('🔍 מתחיל טעינת מצב...');
        const clearedFlag = localStorage.getItem('groupNumberCleared') === '1';
        
        // **שלב 1: טעינת הגדרות מעודכנות מהדרייב ועדכון CONFIG**
        try {
            const downloadedSettings = localStorage.getItem('downloadedSystemSettings');
            if (downloadedSettings) {
                const settings = JSON.parse(downloadedSettings);
                console.log('📦 נמצאו הגדרות שהורדו מהדרייב:', settings);
                
                // **עדכון CONFIG מהגדרות דרייב**
                if (settings.exerciseSettings && window.CONFIG) {
                    console.log('🔧 מעדכן CONFIG מהדרייב...');
                    // דריסה מלאה של CONFIG בהגדרות מהדרייב
                    for (const key in settings.exerciseSettings) {
                        window.CONFIG[key] = settings.exerciseSettings[key];
                    }
                    console.log('✅ CONFIG עודכן:', window.CONFIG);
                }
                
                // **עדכון הגדרות גיבוי**
                if (settings.backupSettings && window.CONFIG) {
                    console.log('🔧 מעדכן הגדרות גיבוי מהדרייב...');
                    if (settings.backupSettings.enabled !== undefined) {
                        window.CONFIG.AUTO_BACKUP_UPLOAD_ENABLED = settings.backupSettings.enabled;
                    }
                    if (settings.backupSettings.intervalMinutes !== undefined) {
                        window.CONFIG.AUTO_BACKUP_UPLOAD_INTERVAL_MS = settings.backupSettings.intervalMinutes * 60 * 1000;
                    }
                    if (settings.backupSettings.stopAfterMinutes !== undefined) {
                        window.CONFIG.AUTO_BACKUP_UPLOAD_MAX_DURATION_MS = settings.backupSettings.stopAfterMinutes * 60 * 1000;
                    }
                }
                
                // **USERS_CONFIG נטען דינמית ואוטומטית, לא צריך לדרוס**
                console.log('👥 USERS_CONFIG קורא דינמית מהדרייב');
            } else {
                console.log('ℹ️ לא נמצאו הגדרות בדרייב, משתמש בברירות מחדל');
            }
        } catch (e) {
            console.warn('⚠️ לא ניתן לטעון הגדרות מהדרייב:', e);
        }
        
        // **שלב 2: טעינת שם המעריך ומספר קבוצה**
        let evaluatorName = '';
        let groupNumber = '';
        
        // 2.1 קודם כל - בדיקה if יש שם מהגדרות (עדיפות עליונה!)
        try {
            const nameFromSettings = localStorage.getItem('evaluatorNameFromSettings');
            if (nameFromSettings) {
                evaluatorName = nameFromSettings;
                console.log('✅ נטען שם מעריך מקובץ הגדרות:', evaluatorName);
            }
        } catch (e) { 
            console.warn('שגיאה בטעינת evaluatorNameFromSettings:', e); 
        }
        
        // 2.2 if לא נמצא שם מהגדרות, נבדוק במצב אימות
        const authSession = localStorage.getItem('gibushAuthState');
        if (authSession) {
            const session = JSON.parse(authSession);
            console.log('🔍 נמצא מצב אימות');
            
            if (session.authState && session.authState.isAuthenticated) {
                // שם מעריך - רק if עדיין אין
                if (!evaluatorName && session.authState.evaluatorName) {
                    evaluatorName = session.authState.evaluatorName;
                    console.log('📋 נטען שם מעריך ממצב אימות:', evaluatorName);
                }
                
                // לא לשחזר מספר קבוצה if דגל איפוס קיים
                if (!clearedFlag && session.authState.groupNumber) {
                    groupNumber = session.authState.groupNumber;
                    console.log('📋 נטען מספר קבוצה ממצב אימות:', groupNumber);
                } else if (clearedFlag) {
                    console.log('🚫 דילוג על שחזור מספר קבוצה (נמחק במפורש)');
                }
                
                if (!state.authState) state.authState = {};
                state.authState = { ...state.authState, ...session.authState };
            }
        }

        // עדכון המצב
        if (evaluatorName) {
            state.evaluatorName = evaluatorName;
            console.log('🎯 שם מעריך סופי:', state.evaluatorName);
        }
        if (groupNumber) {
            state.groupNumber = groupNumber;
            console.log('🎯 מספר קבוצה סופי:', state.groupNumber);
        }

        // **שלב 3: טעינת שאר המצב מ-localStorage**
        const savedData = localStorage.getItem(CONFIG.APP_STATE_KEY);

        if (savedData) {
            const fullLoadedState = JSON.parse(savedData);
            
            // לא נעדכן CONFIG כי כבר עדכנו אותו מההגדרות
            
            // טעינת appState
            Object.assign(state, fullLoadedState.appState || fullLoadedState);

            // **שמירה על השם והקבוצה שטענו (עדיפות גבוהה)**
            if (evaluatorName) {
                state.evaluatorName = evaluatorName;
                console.log('🔄 שמירה על שם מעריך:', state.evaluatorName);
            }
            if (groupNumber) {
                state.groupNumber = groupNumber;
                console.log('🔄 שמירה על מספר קבוצה:', state.groupNumber);
            }

            // אתחול מחדש של מבני נתונים if צריך
            if (!state.heats || state.heats.length !== CONFIG.NUM_HEATS) initializeHeats();
            if (!state.crawlingDrills || !state.crawlingDrills.sprints || state.crawlingDrills.sprints.length !== CONFIG.MAX_CRAWLING_SPRINTS) initializeCrawlingDrills();
            if (!state.sociometricStretcher || !state.sociometricStretcher.heats || state.sociometricStretcher.heats.length !== CONFIG.NUM_STRETCHER_HEATS) initializeSociometricStretcherHeats();
            if (!state.crawlingDrills.activeSackCarriers) state.crawlingDrills.activeSackCarriers = [];
            state.theme = state.theme || 'light';

        } else {
            // אין נתונים שמורים - אתחול
            const preservedEvaluator = evaluatorName;
            const preservedGroup = groupNumber;
            initializeAllData();
            if (preservedEvaluator) {
                state.evaluatorName = preservedEvaluator;
                console.log('🛡️ שחזור שם מעריך:', preservedEvaluator);
            }
            if (preservedGroup) {
                state.groupNumber = preservedGroup;
                console.log('🛡️ שחזור מספר קבוצה:', preservedGroup);
            }
        }

        // המשך שליחה אוטומטית
        if (window.autoBackupManager) {
            setTimeout(() => {
                window.autoBackupManager.resume();
            }, 1000);
        }

        console.log('📊 מצב סופי:', {
            evaluatorName: state.evaluatorName,
            groupNumber: state.groupNumber,
            CONFIG_NUM_HEATS: CONFIG.NUM_HEATS,
            CONFIG_MAX_RUNNERS: CONFIG.MAX_RUNNERS,
            USERS_COUNT: USERS_CONFIG?.users?.length
        });

    } catch (e) {
        console.error("Failed to load or parse state. Resetting data.", e);
        showModal('שגיאת טעינה', 'שגיאה בקריאת הנתונים. ייתכן שהנתונים הקיימים פגומים. האפליקציה תאופס.');
        initializeAllData();
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

    // NEW: אתחול מצב התחרות
    state.competitionStarted = false;

    // ניקוי הערות והערות מהירות
    state.quickComments = {};
    state.generalComments = {};
    state.manualScores = {};

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

    // Focus על השדה if כבר פתוח
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

        if (!evaluatorName) {
            errorDiv.textContent = 'יש להזין שם מעריך';
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

        state.evaluatorName = evaluatorName;
        state.groupNumber = groupNumber; // יכול להיות ריק
        if (!groupNumber) {
            state.__justResetGroupNumber = true;
            localStorage.setItem('groupNumberCleared','1');
        } else {
            delete state.__justResetGroupNumber;
            localStorage.removeItem('groupNumberCleared');
        }

        // עדכון authState ב-localStorage
        try {
            const authRaw = localStorage.getItem('gibushAuthState');
            if (authRaw) {
                const session = JSON.parse(authRaw);
                if (session.authState) {
                    session.authState.evaluatorName = evaluatorName;
                    if (groupNumber) session.authState.groupNumber = groupNumber; else delete session.authState.groupNumber;
                    localStorage.setItem('gibushAuthState', JSON.stringify(session));
                }
            }
        } catch(e){ console.warn('authState update failed', e); }

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
    // בדוק if אנחנו בעמוד הראשי ויש רשימת רצים
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
    // NEW: דרישת מספר קבוצה לפני התחלת מקצים
    if (!state.groupNumber || String(state.groupNumber).trim() === '') {
        showModal('חסר מספר קבוצה', 'יש להזין מספר קבוצה לפני התחלת המקצים.', () => {
            if (typeof showEditBasicDetailsModal === 'function') showEditBasicDetailsModal();
        });
        return;
    }
    if (state.runners.length === 0) {
        showError("יש להוסיף לפחות מועמד אחד כדי להתחיל.");
        return;
    }

    // NEW: הוספת התראה לפני התחלת מקצים
    showModal(
        'התחלת מקצים - אזהרה חשובה!',
        `⚠️ לאחר המעבר למקצים לא תהיה יותר אפשרות לערוך את רשימת המועמדים או לשנות את מבנה הקבוצה.

כל עריכה של מתמודדים תיחסם ורק המתמודדים הנוכחיים ישתתפו בתחרות.

להמשיך למקצים?`,
        () => {
            // סימון שהתחילו מקצים - זה ינעל עריכות
            state.competitionStarted = true;
            state.currentPage = PAGES.HEATS;
            
            // NEW: התחלת שליחה אוטומטית של גיבוי
            if (window.autoBackupManager) {
                window.autoBackupManager.start();
            }
            
            saveState();
            renderPage();
        }
    );
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

            showModal('אישור ייבוא נתונים', 'הif אתה בטוח? פעולה זו תחליף את כל הנתונים הנוכחיים בנתונים מהקובץ.', () => {

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
function recoverEvaluatorDetailsIfMissing() {
    // UPDATED: only try to recover evaluatorName; do NOT overwrite existing groupNumber unless explicitly cleared
    const clearedFlag = localStorage.getItem('groupNumberCleared') === '1';
    if (!state.evaluatorName) {
        try {
            const authSession = localStorage.getItem('gibushAuthState');
            if (authSession) {
                const session = JSON.parse(authSession);
                if (session?.authState?.evaluatorName) {
                    state.evaluatorName = session.authState.evaluatorName;
                }
            }
        } catch (e) { /* silent */ }
    }
    if (clearedFlag) {
        // user explicitly cleared group number previously
        state.groupNumber = '';
    }
    // If not clearedFlag we leave state.groupNumber as-is (no auto blanking)
}
function ensureUserAvatar() {
    try {
        // חיפוש המיכל הייעודי לאווטר (בצד ימין)
        const avatarContainer = document.querySelector('header .flex.items-center.justify-between > div:first-child');
        if (!avatarContainer) return;
        
        let avatarBtn = document.getElementById('user-avatar-btn');
        if (!avatarBtn) {
            avatarBtn = document.createElement('button');
            avatarBtn.id = 'user-avatar-btn';
            avatarBtn.title = 'תפריט משתמש';
            avatarBtn.style.width = '40px';
            avatarBtn.style.height = '40px';
            avatarBtn.style.minWidth = '40px';
            avatarBtn.style.borderRadius = '50%';
            avatarBtn.style.overflow = 'hidden';
            avatarBtn.style.border = '2px solid rgba(37, 99, 235, 0.3)';
            avatarBtn.style.display = 'flex';
            avatarBtn.style.alignItems = 'center';
            avatarBtn.style.justifyContent = 'center';
            avatarBtn.style.background = 'linear-gradient(135deg,#2563eb,#1e3a8a)';
            avatarBtn.style.cursor = 'pointer';
            avatarBtn.style.transition = 'all 0.2s ease';
            avatarBtn.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.2)';
            avatarBtn.innerHTML = '<span style="font-size:20px;color:#fff">👤</span>';
            
            // הוספת אפקט hover
            avatarBtn.addEventListener('mouseenter', () => {
                avatarBtn.style.transform = 'scale(1.05)';
                avatarBtn.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)';
            });
            avatarBtn.addEventListener('mouseleave', () => {
                avatarBtn.style.transform = 'scale(1)';
                avatarBtn.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.2)';
            });
            
            avatarContainer.appendChild(avatarBtn);
            avatarBtn.addEventListener('click', onAvatarClick);
        }
        
        // קביעת תמונה
        let imgUrl = '';
        const method = state?.authState?.authMethod;
        if (method === 'google' && state.authState?.googleUserInfo?.picture) {
            imgUrl = state.authState.googleUserInfo.picture;
        }
        
        if (imgUrl) {
            if (!avatarBtn.querySelector('img')) {
                avatarBtn.innerHTML = '';
                const img = document.createElement('img');
                img.src = imgUrl;
                img.alt = 'user';
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                avatarBtn.appendChild(img);
            } else {
                avatarBtn.querySelector('img').src = imgUrl;
            }
        } else {
            // אורח - אייקון ברירת מחדל
            avatarBtn.innerHTML = '<span style="font-size:20px;color:#fff">👤</span>';
        }
    } catch (e) {
        console.warn('ensureUserAvatar failed', e);
    }
}

function onAvatarClick() {
    // בדיקה אם כבר קיים תפריט פתוח
    const existingMenu = document.getElementById('user-dropdown-menu');
    if (existingMenu) {
        existingMenu.remove();
        return;
    }

    // בדיקת מצב כהה
    const isDark = document.documentElement.classList.contains('dark');

    // יצירת תפריט נפתח
    const menu = document.createElement('div');
    menu.id = 'user-dropdown-menu';
    
    // סגנון דינמי לפי מצב לילה
    const menuBg = isDark ? '#1f2937' : 'white';
    const separatorColor = isDark ? '#374151' : '#e5e7eb';
    
    menu.style.cssText = `
        position: fixed;
        top: 70px;
        right: 20px;
        background: ${menuBg};
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,${isDark ? '0.5' : '0.15'});
        z-index: 9999;
        min-width: 240px;
        overflow: hidden;
        animation: slideDown 0.2s ease-out;
    `;

    // בדיקת הרשאת מנהל
    const isAdmin = (() => {
        try {
            const email = state?.authState?.googleUserInfo?.email;
            if (!email) return false;
            return window.USERS_CONFIG?.isAdmin?.(email) || false;
        } catch (e) {
            return false;
        }
    })();

    // יצירת תוכן התפריט
    const menuItems = [
        { id: 'admin-settings', icon: '⚙️', text: 'הגדרות מנהל', adminOnly: true },
        { id: 'reset-app', icon: '🔄', text: 'אפס אפליקציה', color: '#ef4444' },
        { id: 'clear-cache', icon: '🗑️', text: 'נקה Cache', color: '#9333ea' },
        { type: 'separator' },
        { id: 'backup-upload', icon: '☁️', text: 'שלח גיבוי למנהל', color: '#6366f1' },
        { id: 'backup-download', icon: '💾', text: 'הורד גיבוי', color: '#8b5cf6' },
        { id: 'backup-import', icon: '📤', text: 'טען גיבוי', color: '#10b981' },
        { type: 'separator' },
        { id: 'logout', icon: '🚪', text: 'התנתק', color: '#dc2626' }
    ];

    menu.innerHTML = menuItems.map(item => {
        if (item.type === 'separator') {
            return `<div style="height:1px;background:${separatorColor};margin:4px 0;"></div>`;
        }
        
        // דילוג על פריטי מנהל if לא מנהל
        if (item.adminOnly && !isAdmin) {
            return '';
        }

        const color = item.color || (isDark ? '#d1d5db' : '#374151');
        const hoverBg = isDark ? '#374151' : '#f3f4f6';
        
        return `
            <button 
                id="menu-${item.id}" 
                class="menu-item-btn"
                data-hover-bg="${hoverBg}"
                style="
                    width: 100%;
                    padding: 12px 16px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    color: ${color};
                    transition: background 0.15s;
                    text-align: right;
                "
            >
                <span style="font-size: 20px;">${item.icon}</span>
                <span style="flex: 1;">${item.text}</span>
            </button>
        `;
    }).join('');

    document.body.appendChild(menu);

    // הוספת אפקט hover דינמי לכפתורים
    menu.querySelectorAll('.menu-item-btn').forEach(btn => {
        const hoverBg = btn.dataset.hoverBg;
        btn.addEventListener('mouseenter', () => {
            btn.style.background = hoverBg;
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.background = 'transparent';
        });
    });

    // סגירה בלחיצה מחוץ לתפריט
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target) && e.target.id !== 'user-avatar-btn') {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 0);

    // הוספת אנימציה
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    if (!document.getElementById('dropdown-animation-style')) {
        style.id = 'dropdown-animation-style';
        document.head.appendChild(style);
    }

    // חיבור מאזינים לכפתורים
    const handlers = {
        'admin-settings': handleAdminSettingsClick,
        'reset-app': handleResetApp,
        'clear-cache': handleClearCache,
        'backup-upload': handleBackupUpload,
        'backup-download': handleBackupDownload,
        'backup-import': handleBackupImport,
        'logout': handleLogout
    };

    Object.entries(handlers).forEach(([id, handler]) => {
        const btn = document.getElementById(`menu-${id}`);
        if (btn) {
            btn.addEventListener('click', () => {
                menu.remove();
                handler();
            });
        }
    });
}

// פונקציות טיפול באירועים
function handleResetApp() {
    showModal('איפוס אפליקציה', 'האם אתה בטוח? כל הנתונים יימחקו לצמיתות.', () => {
        // עצירת שליחה אוטומטית לפני איפוס
        if (window.autoBackupManager) {
            try { window.autoBackupManager.stop('איפוס אפליקציה'); } catch(e){}
        }
        // מחיקת נתוני מצב קיימים
        try { localStorage.removeItem(CONFIG.APP_STATE_KEY); } catch(e){}
        try { localStorage.removeItem('downloadedSystemSettings'); } catch(e){}
        try { sessionStorage.clear(); } catch(e){}

        // איפוס מצב בזיכרון
        if (typeof initializeAllData === 'function') initializeAllData();
        state.currentPage = PAGES.RUNNERS;
        if (typeof saveState === 'function') saveState();

        // ניסיון לנקות service workers ו-caches
        (async () => {
            try {
                if ('serviceWorker' in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(regs.map(r => r.unregister()));
                }
            } catch(e) { /* silent */ }
            try {
                if (window.caches) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(k => caches.delete(k)));
                }
            } catch(e){ /* silent */ }
        })();

        // רינדור מחדש ואז פתיחת מודאל עריכת פרטי הקבוצה
        if (typeof renderPage === 'function') renderPage();
        setTimeout(() => {
            if (typeof showEditBasicDetailsModal === 'function') {
                try { showEditBasicDetailsModal(); } catch(e){ console.warn('פתיחת מודאל פרטי משתמש נכשלה', e); }
            }
        }, 60);
    });
}

async function handleClearCache() {
    if (!confirm('לנקות את כל ה-Cache של האפליקציה? פעולה זו תרענן את האפליקציה ותבטיח שכל העדכונים יוצגו.')) return;
    
    try {
        if (window.PWA?.forceRefreshApp) {
            await window.PWA.forceRefreshApp();
        } else {
            // Fallback אם PWA לא זמין
            if (window.caches) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }
            if (navigator.serviceWorker) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(reg => reg.unregister()));
            }
            sessionStorage.clear();
            window.location.reload(true);
        }
    } catch (error) {
        console.error('שגיאה בניקוי Cache:', error);
        alert('שגיאה בניקוי Cache. נסה לרענן ידנית (Ctrl+Shift+R)');
    }
}

async function handleBackupUpload() {
    if (!window.CompactBackup) { 
        showModal('שגיאה','מודול גיבוי לא נטען'); 
        return; 
    }
    await window.CompactBackup.createAndUploadCompactBackup(window.showModal);
}

function handleBackupDownload() {
    if (!window.CompactBackup) { 
        showModal('שגיאה','מודול גיבוי לא נטען'); 
        return; 
    }
    window.CompactBackup.downloadLocal();
}

function handleBackupImport() {
    // יצירת input file חבוי
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';
    
    input.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        try {
            const txt = await file.text();
            let parsed;
            try { 
                parsed = JSON.parse(txt); 
            } catch(err) { 
                showModal('שגיאה','קובץ גיבוי לא תקין'); 
                return; 
            }
            
            if (!parsed) { 
                showModal('שגיאה','קובץ ריק'); 
                return; 
            }
            
            if (!confirm('לייבא את הגיבוי ולדרוס את הנתונים הנוכחיים?')) return;
            
            // קריאה לפונקציית שחזור
            if (typeof restoreFromCompactBackup === 'function') {
                restoreFromCompactBackup(parsed);
                showModal('הצלחה','הגיבוי נטען בהצלחה');
            } else {
                showModal('שגיאה','פונקציית שחזור לא זמינה');
            }
        } catch(err) {
            console.error('Import compact backup failed', err);
            showModal('שגיאה','ייבוא נכשל');
        } finally {
            input.remove();
        }
    });
    
    document.body.appendChild(input);
    input.click();
}

function handleLogout() {
    showModal('יציאה מהמערכת', 'האם לצאת ולמחוק את כל נתוני הגיבוש?', () => {
        try {
            // עצירת שליחה אוטומטית לפני יציאה
            if (window.autoBackupManager) {
                window.autoBackupManager.stop('יציאה מהמערכת');
            }
            
            // ניקוי כל המפתחות הרלוונטיים
            localStorage.removeItem('gibushAuthState');
            localStorage.removeItem('gibushAppState');
            localStorage.removeItem('evaluatorDetails');
            localStorage.removeItem(CONFIG?.APP_STATE_KEY || 'gibushAppState');
            localStorage.clear();
        } catch(e) { 
            console.warn('logout clear error', e); 
        }
        // הפניה לעמוד הנחיתה
        window.location.href = 'landing.html';
    });
}
function renderPage() {
    recoverEvaluatorDetailsIfMissing();
    ensureDomRefs();
    
    // הוספת בדיקה למניעת לופ אינסופי
    if (!renderPage._retryCount) renderPage._retryCount = 0;
    
    if (!contentDiv) { 
        if (renderPage._retryCount < 10) {
            renderPage._retryCount++;
            setTimeout(() => {
                renderPage._retryCount = 0; // איפוס הקאונטר
                renderPage();
            }, 50); 
            return;
        } else {
            console.error('Failed to find content element after 10 retries');
            renderPage._retryCount = 0;
            return;
        }
    }

    const content = document.getElementById('content');
    if (!content) { 
        if (renderPage._retryCount < 10) {
            renderPage._retryCount++;
            setTimeout(() => {
                renderPage._retryCount = 0; // איפוס הקאונטר
                renderPage();
            }, 50); 
            return;
        } else {
            console.error('Failed to find content element after 10 retries');
            renderPage._retryCount = 0;
            return;
        }
    }

    // איפוס הקאונטר כשהכל בסדר
    renderPage._retryCount = 0;

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
    state.currentPage !== PAGES.RUNNERS &&
    state.currentPage !== PAGES.AGGREGATED_DASHBOARD; // hide on aggregated dashboard

  const quickBarDiv = document.getElementById('quick-comment-bar-container');
  if (quickBarDiv) {
    if (!shouldShowQuickBar) {
        quickBarDiv.style.display = 'none';
    } else {
        quickBarDiv.style.display = '';
    }
  }
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

    // הצגת/הסתרת לשונית דשבורד לפי הרשאת מנהל (לוג משופר + ניסיון חוזר)
    (function(){
        try {
            const li = document.getElementById('aggregated-dashboard-nav-item');
            if (!li) return;
            const email = (state?.authState?.googleUserInfo?.email || '').trim().toLowerCase();
            const isAdminFast = typeof USERS_CONFIG?.isAdmin === 'function' ? USERS_CONFIG.isAdmin(email) : false;
            const adminEmails = (window.USERS_CONFIG?.getAdminEmails?.() || []).map(e=>String(e||'').toLowerCase());
            const listEmpty = adminEmails.length === 0; // אם הרשימה ריקה – נניח מצב הגדרה לא נטען עדיין => הצג
            const isAuthorized = listEmpty || isAdminFast;
            li.style.display = isAuthorized ? '' : 'none';
            if (!window.__dashDebugLogged) {
                console.log('[Dashboard] email=', email, 'adminEmails=', adminEmails, 'listEmpty=', listEmpty, 'isAdminFast=', isAdminFast, 'show=', isAuthorized);
                window.__dashDebugLogged = true;
            }
            // ניסיון חוזר אם אין אימייל עדיין (טעינה מאוחרת) – עד 10 פעמים
            if (!email && !listEmpty) {
                let tries = 0;
                const retry = () => {
                    const em = (state?.authState?.googleUserInfo?.email || '').trim().toLowerCase();
                    if (em) {
                        const ok = listEmpty || USERS_CONFIG.isAdmin(em);
                        li.style.display = ok ? '' : 'none';
                        console.log('[Dashboard][retry] email=', em, 'ok=', ok);
                        return;
                    }
                    if (++tries < 10) setTimeout(retry, 300);
                };
                setTimeout(retry, 300);
            }
        } catch(e){ console.warn('aggregated dashboard tab toggle failed', e); }
    })();

    document.querySelectorAll('.nav-tab').forEach(tab => {
        const page = tab.dataset.page;
        let shouldDisable = false;
        const isDash = page === PAGES.AGGREGATED_DASHBOARD;
        const emailDash = (state?.authState?.googleUserInfo?.email || '').toLowerCase();
        const adminEmailsDash = (window.USERS_CONFIG?.getAdminEmails?.() || []).map(e=>String(e||'').toLowerCase());
        const dashAllowed = adminEmailsDash.length===0 || (emailDash && adminEmailsDash.includes(emailDash));
        // חסימה של עמודים אחרים ללא מתמודדים
        if (!dashAllowed && !state.runners?.length && page !== PAGES.RUNNERS) shouldDisable = true;
        // לפני התחלת מקצים – חסום הכל מלבד runners ו dashboard (if מורשה)
        if (!state.competitionStarted && !isDash && page !== PAGES.RUNNERS) shouldDisable = true;
        if (!dashAllowed && isDash) {
            shouldDisable = true; // דשבורד חסום if לא מורשה
        }
        tab.classList.toggle('is-disabled', shouldDisable);
        tab.setAttribute('aria-disabled', shouldDisable ? 'true' : 'false');
        if (shouldDisable) {
            tab.style.pointerEvents = 'none';
            if (isDash && !dashAllowed) tab.title = 'גישה לדשבורד רק למנהל מורשה';
            else if (!state.competitionStarted && !isDash && page !== PAGES.RUNNERS) tab.title = 'יש להתחיל מקצים';
            else if (!state.runners?.length && page !== PAGES.RUNNERS) tab.title = 'הוסף מתמודדים תחילה';
        } else {
            tab.style.pointerEvents = '';
            tab.removeAttribute('title');
        }
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

    ensureUserAvatar();

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
            if (state.__needsReportRefresh && typeof window.updateAllSprintScores === 'function') {
                try { window.updateAllSprintScores(); } catch(e){ console.warn('updateAllSprintScores before report render failed', e); }
                state.__needsReportRefresh = false;
            }
            window.Pages.renderReportPage?.(); 
            break;
        case PAGES.AGGREGATED_DASHBOARD:
            setPageTitle('דשבורד מאוחד');
            window.Pages.renderAggregatedDashboardPage?.();
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
    // UPDATED: show current group number (may be empty)
    const groupValue = state.groupNumber || '';
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
                <input type="text" id="edit-basic-group-number" value="${groupValue}" 
                       class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-lg text-right bg-white dark:bg-gray-700 dark:text-white" placeholder="מספר קבוצה">
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
        if (!evaluatorName) {
            errorDiv.textContent = 'יש למלא את שם המעריך';
            errorDiv.classList.remove('hidden');
            return;
        }
        state.evaluatorName = evaluatorName;
        state.groupNumber = groupNumber; // keep what user entered (can be empty)
        if (!groupNumber) {
            localStorage.setItem('groupNumberCleared','1');
        } else {
            localStorage.removeItem('groupNumberCleared');
        }
        // Update auth state (sync both fields)
        try {
            const authRaw = localStorage.getItem('gibushAuthState');
            if (authRaw) {
                const session = JSON.parse(authRaw);
                if (session.authState) {
                    session.authState.evaluatorName = evaluatorName;
                    if (groupNumber) session.authState.groupNumber = groupNumber; else delete session.authState.groupNumber;
                    localStorage.setItem('gibushAuthState', JSON.stringify(session));
                }
            }
        } catch(e){ console.warn('failed to update authState', e); }
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

// NEW: פונקציה לבדיקת הרשאת משתמש לדשבורד
function isUserAuthorizedForDashboard() {
    try {
        const email = state?.authState?.googleUserInfo?.email;
        if (!email) return false;
        if (window.USERS_CONFIG?.isAdmin) return USERS_CONFIG.isAdmin(email);
        return false;
    } catch (e) {
        return false;
    }
}

async function init() {
    try { if ('wakeLock' in navigator) { /* no-op */ }} catch { /* Handle error if needed */ }

    // מאזין ניווט ראשי עם מניעת ברירת מחדל ועצירת טאבים מושבתים
    const navEl = document.querySelector('nav');
    if (navEl) {
        navEl.addEventListener('click', (e) => {
            const tab = e.target.closest('.nav-tab');
            if (!tab) return;
            e.preventDefault(); // מונע קפיצה/רענון של <a>

            // אל תלחץ if מושבת
            if (tab.classList.contains('is-disabled') || tab.getAttribute('aria-disabled') === 'true') return;

            const nextPage = tab.dataset.page;
            
            // NEW: חסימת ניווט לפני התחלת מקצים - עם חריג לדשבורד למנהלים מורשים
            if (!state.competitionStarted && nextPage !== PAGES.RUNNERS) {
                // if זה דשבורד ומשתמש מורשה - אפשר מעבר
                if (nextPage === PAGES.AGGREGATED_DASHBOARD && isUserAuthorizedForDashboard()) {
                    // עבור ישירות לדשבורד ללא חסימה
                } else {
                    showModal('התחלת מקצים נדרשת', 'לא ניתן לעבור לעמודים אחרים לפני התחלת המקצים. לחץ על "התחל מקצים" בעמוד ניהול הקבוצה.');
                    return;
                }
            }
            
            // NEW: בדיקה if יש מקצה פעיל שלא הסתיים
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
    ensureUserAvatar();
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

// === מנגנון שליחה אוטומטית של גיבוי ===
let autoBackupManager = {
    // פונקציה לשליחת גיבוי אוטומטי
    async performAutoUpload() {
        try {
            console.log('🤖 מבצע שליחה אוטומטית של גיבוי...');
            
            // FIXED: שימוש באותה פונקציה כמו הכפתור הידני
            if (typeof window.CompactBackup?.uploadCompactBackup === 'function') {
                const result = await window.CompactBackup.uploadCompactBackup();
                
                if (result.status === 'success') {
                    state.autoBackupUpload.lastUploadTime = Date.now();
                    state.autoBackupUpload.uploadCount++;
                    console.log('✅ שליחה אוטומטית הצליחה');
                } else {
                    console.warn('⚠️ שליחה אוטומטית נכשלה:', result.message);
                }
            } else {
                console.warn('⚠️ מערכת גיבוי קומפקטי לא זמינה');
            }
        } catch (error) {
            console.error('❌ שגיאה בשליחה אוטומטית:', error);
        }
    },

    // התחלת שליחה אוטומטית
    start() {
        if (!CONFIG.AUTO_BACKUP_UPLOAD_ENABLED) {
            console.log('🚫 שליחה אוטומטית מושבתת בקונפיגורציה');
            return;
        }

        // NEW: חסימת שליחה אוטומטית במצב אורח
        if (this.isGuestUser()) {
            console.log('🚫 שליחה אוטומטית לא פעילה במצב אורח');
            return;
        }

        if (state.autoBackupUpload.isActive) {
            console.log('⚠️ שליחה אוטומטית כבר פעילה');
            return;
        }

        console.log('🚀 מתחיל שליחה אוטומטית של גיבוי...');
        
        state.autoBackupUpload.isActive = true;
        state.autoBackupUpload.startTime = Date.now();
        state.autoBackupUpload.hasBeenManuallyStopped = false;
        state.autoBackupUpload.uploadCount = 0;

        // ביצוע שליחה ראשונה מיד
        this.performAutoUpload();

        // קביעת interval לשליחות נוספות
        state.autoBackupUpload.intervalId = setInterval(() => {
            if (!state.autoBackupUpload.isActive || state.autoBackupUpload.hasBeenManuallyStopped) {
                this.stop();
                return;
            }

            const elapsed = Date.now() - state.autoBackupUpload.startTime;
            const maxMs = CONFIG.AUTO_BACKUP_UPLOAD_MAX_DURATION_MS;
            if (elapsed >= maxMs) {
                // במקום לעצור מיד – הצג חלון בחירה
                this._showExtendOrStopModal();
                return; // ממתין להחלטת המשתמש
            }

            this.performAutoUpload();
        }, CONFIG.AUTO_BACKUP_UPLOAD_INTERVAL_MS);

        saveState();
    },

    // NEW: פונקציה לבדיקת משתמש אורח
    isGuestUser() {
        try {
            const saved = localStorage.getItem('gibushAuthState');
            if (!saved) return true;
            const session = JSON.parse(saved);
            return session?.authState?.authMethod === 'guest';
        } catch (e) {
            return true; // במקרה של שגיאה נחשיב כאורח
        }
    },

    // עצירת שליחה אוטומטית
    stop(reason = 'לא צוין') {
        if (!state.autoBackupUpload.isActive) {
            return;
        }

        console.log('🛑 עוצר שליחה אוטומטית:', reason);
        
        if (state.autoBackupUpload.intervalId) {
            clearInterval(state.autoBackupUpload.intervalId);
            state.autoBackupUpload.intervalId = null;
        }

        state.autoBackupUpload.isActive = false;
        saveState();
    },

    // סימון שהשליחה הופסקה ידנית
    markManuallyStopped() {
        state.autoBackupUpload.hasBeenManuallyStopped = true;
        this.stop('שליחה ידנית');
    },

    // המשך שליחה אוטומטית אחרי רענון עמוד
    resume() {
        if (!CONFIG.AUTO_BACKUP_UPLOAD_ENABLED) return;
        
        // NEW: חסימת שליחה אוטומטית במצב אורח
        if (this.isGuestUser()) {
            console.log('🚫 שליחה אוטומטית לא פעילה במצב אורח');
            return;
        }
        
        // בדיקה if התחרות התחילה והשליחה לא הופסקה ידנית
        if (state.competitionStarted && 
            !state.autoBackupUpload.hasBeenManuallyStopped &&
            state.autoBackupUpload.startTime) {
            
            const elapsed = Date.now() - state.autoBackupUpload.startTime;
            
            // if עדיין בטווח הזמן המותר
            if (elapsed < CONFIG.AUTO_BACKUP_UPLOAD_MAX_DURATION_MS) {
                console.log('🔄 ממשיך שליחה אוטומטית אחרי רענון עמוד');
                
                // FIXED: אפסי את isActive כדי לאפשר התחלה מחדש
                state.autoBackupUpload.isActive = false;
                state.autoBackupUpload.intervalId = null;
                
                this.start();
            } else {
                console.log('⏰ שליחה אוטומטית פגה (מעל 5 שעות)');
                state.autoBackupUpload.hasBeenManuallyStopped = true;
                state.autoBackupUpload.isActive = false;
                state.autoBackupUpload.intervalId = null;
                saveState();
            }
        }
    },

    _showExtendOrStopModal() {
        // הגנה נגד פתיחת מודאל כפול
        if (document.getElementById('auto-backup-extend-modal')) return;
        const backdrop = document.createElement('div');
        backdrop.id = 'auto-backup-extend-modal';
        backdrop.style.position = 'fixed';
        backdrop.style.inset = '0';
        backdrop.style.background = 'rgba(0,0,0,0.55)';
        backdrop.style.zIndex = '9999';
        backdrop.style.display = 'flex';
        backdrop.style.alignItems = 'center';
        backdrop.style.justifyContent = 'center';
        const minutesConfigured = Math.round(CONFIG.AUTO_BACKUP_UPLOAD_MAX_DURATION_MS / 60000);
        backdrop.innerHTML = `
          <div style="background:#fff;color:#0f172a;border-radius:20px;box-shadow:0 12px 38px -10px rgba(0,0,0,.35);padding:26px 30px;max-width:430px;width:100%;font-family:system-ui,Segoe UI,sans-serif;display:flex;flex-direction:column;gap:18px;">
            <h3 style="margin:0;font-size:20px;font-weight:700;display:flex;align-items:center;gap:8px;color:#0d9488;">⏰ סיום גיבוי אוטומטי</h3>
            <p style="margin:0;font-size:14px;line-height:1.45;font-weight:500;white-space:pre-line;">
הגיבוי האוטומטי פעל ${minutesConfigured} דקות ומוכן להפסיק.
להמשיך לעוד 5 שעות (300 דקות) או להפסיק עכשיו?</p>
            <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;">
              <button id="auto-backup-stop-btn" style="background:#ef4444;color:#fff;font-weight:700;border:none;border-radius:12px;padding:10px 20px;font-size:14px;cursor:pointer;">הפסק</button>
              <button id="auto-backup-extend-btn" style="background:linear-gradient(90deg,#0d9488,#059669);color:#fff;font-weight:700;border:none;border-radius:12px;padding:10px 20px;font-size:14px;cursor:pointer;">המשך 5 שעות</button>
            </div>
          </div>`;
        document.body.appendChild(backdrop);
        const stopBtn = backdrop.querySelector('#auto-backup-stop-btn');
        const extendBtn = backdrop.querySelector('#auto-backup-extend-btn');
        stopBtn.onclick = () => {
            this.stop('המשתמש בחר להפסיק');
            try { backdrop.remove(); } catch(e){}
            showNotification?.('🔴 הגיבוי האוטומטי הופסק', 'warning');
        };
        extendBtn.onclick = () => {
            // הארכת זמן: איפוס זמן התחלה + קביעת מקסימום חדש ל-5 שעות
            state.autoBackupUpload.startTime = Date.now();
            CONFIG.AUTO_BACKUP_UPLOAD_MAX_DURATION_MS = 5 * 60 * 60 * 1000; // 5 שעות
            if (CONFIG.AUTO_BACKUP_SETTINGS) CONFIG.AUTO_BACKUP_SETTINGS.stopAfterMinutes = 300; // עדכון תצוגה עתידי
            saveState?.();
            try { backdrop.remove(); } catch(e){}
            showNotification?.('✅ הגיבוי האוטומטי הוארך לעוד 5 שעות', 'success');
        };
    }
};

window.autoBackupManager = autoBackupManager;