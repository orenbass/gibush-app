if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").then(() => {
        console.log("Service Worker Registered");
    }).catch((error) => {
        console.error("Service Worker Registration Failed:", error);
    });
}
// --- Application Constants & Config ---

// הגדרות גלובליות לאפליקציה.

// ערכים אלו ניתנים לשינוי בדף הגדרות המנהל.

let CONFIG = {

    NUM_HEATS: 14,     // מספר מקצי ספרינט

    MAX_CRAWLING_SPRINTS: 4,   // מספר מקסימלי של מקצי ספרינט זחילות

    MAX_RUNNERS: 20,         // מספר מקסימלי של רצים מותר

    MAX_SACK_CARRIERS: 3,    // מספר מקסימלי של נושאי שק בתרגילי זחילה

    NUM_STRETCHER_HEATS: 8,      // מספר מקצי אלונקה סוציומטרית

    MAX_STRETCHER_CARRIERS: 4, // מספר נושאי אלונקה מקסימלי למקצה

    MAX_JERRICAN_CARRIERS: 3,  // שינוי לברירת מחדל 3

    STRETCHER_PAGE_LABEL: 'אלונקות', // התווית ללשונית ולכותרת הדף

    STRETCHER_CARRIER_NOUN_PLURAL: 'רצים שלקחו אלונקה', // שם העצם ברבים שמוצג בהנחיית הבחירה

    APP_STATE_KEY: 'sprintAppState_v1.11' // מפתח לאחסון מצב האפליקציה ב-localStorage

};

// סיסמת מנהל לדף ההגדרות

const ADMIN_PASSWORD = 'malkin';



// אובייקט דמוי-enum לשמות דפים כדי למנוע שימוש במחרוזות קסם

const PAGES = {

    RUNNERS: 'runners',

    STATUS_MANAGEMENT: 'status-management',

    HEATS: 'heats',

    CRAWLING_COMMENTS: 'crawling-drills-comments',

    CRAWLING_SPRINT: 'crawling-sprint',

    STRETCHER_HEAT: 'sociometric-stretcher-heat',

    REPORT: 'report',

    ADMIN_SETTINGS: 'admin-settings'

};



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



// --- DOM Elements ---

// הפניות לאלמנטים מרכזיים ב-DOM לצורך מניפולציה יעילה

const contentDiv = document.getElementById('content');

const headerTitle = document.getElementById('header-title');

const autosaveStatus = document.getElementById('autosave-status');

const loadingOverlay = document.getElementById('loading-overlay'); // V1.11 - Added loading overlay
let tempStateBackup = null; // גיבוי זמני למצב עריכה בדוח



// --- Utility Functions ---



/**

 * Formats a given time in milliseconds into MM:SS:mmm string format.

 * @param {number} ms - Time in milliseconds.

 * @returns {string} Formatted time string.

 */

function formatTime(ms) {

    if (ms < 0) ms = 0; // Ensure time is not negative

    const minutes = Math.floor(ms / 60000);

    const seconds = Math.floor((ms % 60000) / 1000);

    const milliseconds = Math.floor((ms % 1000));

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(milliseconds).padStart(3, '0')}`;

}



/**

 * Formats a given time in milliseconds into MM:SS string format.

 * @param {number} ms - Time in milliseconds.

 * @returns {string} Formatted time string.

 */

function formatTime_no_ms(ms) {

    if (ms < 0) ms = 0;

    const minutes = Math.floor(ms / 60000);

    const seconds = Math.floor((ms % 60000) / 1000);

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

}

/**
 * Normalizes a numeric value to a score in range[1..7].
 * - If min < max: value = min -> 1, value = max -> 7.
    * - If min > max: mapping is inverted(value = min -> 7, value = max -> 1).
 * Values מחוץ לטווח נחתכים.התוצאה מעוגלת למספר שלם.
 */
function normalizeScore(value, min, max) {
    if (min === max) {
        return value > min ? 7 : 1;
    }
    const inverted = max < min;
    const lo = inverted ? max : min;
    const hi = inverted ? min : max;

    const v = Math.min(Math.max(value, lo), hi);
    let t = (v - lo) / (hi - lo); // 0..1
    if (inverted) t = 1 - t;

    return Math.min(7, Math.max(1, Math.round(1 + t * 6)));
}

/**

 * Updates the main timer display on the UI.

 * @param {number} elapsedTime - The elapsed time in milliseconds to display.

 * @param {boolean} showMilliseconds - Whether to show milliseconds in the display.

 */

function updateTimerDisplay(elapsedTime, showMilliseconds = true) {

    const timerDisplay = document.getElementById('timer-display');

    if (timerDisplay) {

        if (showMilliseconds) {

            timerDisplay.textContent = `⏰ ${formatTime(elapsedTime)}`;

        } else {

            timerDisplay.textContent = `⏰ ${formatTime_no_ms(elapsedTime)}`;

        }

    }
}

/**

 * Shows leave-confirmation if leaving Crawling Comments while there are active sack carriers.

 * Returns true אם נפתח דיאלוג (הפעולה יורטה), false אחרת.

 */

function confirmLeaveCrawlingComments(onConfirm) {

    const onCrawlingComments = state.currentPage === PAGES.CRAWLING_COMMENTS;

    const hasActive = Array.isArray(state.crawlingDrills?.activeSackCarriers) && state.crawlingDrills.activeSackCarriers.length > 0;

    if (onCrawlingComments && hasActive) {

        showModal(

            'אישור יציאה',

            'יציאה תפסיק את כל נושאי השק ותנקה את הבחירות. להמשיך?',

            () => {

                // הפסקת כל הטיימרים וניקוי בחירות

                stopAllSackTimers();

                state.crawlingDrills.activeSackCarriers = [];

                saveState();

                if (onConfirm) onConfirm();

            }

        );

        return true; // interception

    }

    return false; // no interception

}

/**

 * Displays a custom confirmation modal (replaces native alert/confirm).

 * @param {string} title - The title of the modal.

 * @param {string} message - The message to display in the modal.

 * @param {Function} onConfirm - Callback function to execute if 'Confirm' is clicked.

 * @param {boolean} isInputModal - Whether the modal should include an input field.

 * @param {Function} onInputConfirm - Callback for input modal.

 */

function showModal(title, message, onConfirm, isInputModal = false, onInputConfirm) {

    // Remove any existing modal to prevent duplicates

    const existingModal = document.getElementById('confirmation-modal');

    if (existingModal) existingModal.remove();



    // Create modal backdrop and content

    const modalBackdrop = document.createElement('div');

    modalBackdrop.className = 'fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50';

    modalBackdrop.id = 'confirmation-modal';



    let inputHtml = '';

    if (isInputModal) {

        inputHtml = `<input type="password" id="modal-input" class="w-full p-2 mt-4 border border-gray-300 rounded-lg text-lg text-right" placeholder="הכנס קוד גישה">`;

    }



    modalBackdrop.innerHTML = `

    <div class="bg-white rounded-lg shadow-2xl p-6 w-full max-w-sm mx-4 text-right">

        <h3 class="text-xl font-bold mb-4">${title}</h3>

        <p class="text-gray-700 mb-6">${message}</p>

        ${inputHtml}

        <div class="flex justify-end space-x-4 space-x-reverse mt-6">

            <button id="confirm-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">אישור</button>

            <button id="cancel-btn" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg">ביטול</button>

        </div>

    </div>`;

    document.body.appendChild(modalBackdrop);



    const confirmBtn = document.getElementById('confirm-btn');

    const cancelBtn = document.getElementById('cancel-btn');



    if (isInputModal) {

        confirmBtn.onclick = () => {

            const input = document.getElementById('modal-input').value;

            if (onInputConfirm) onInputConfirm(input);

            document.body.removeChild(modalBackdrop);

        };

    } else {

        confirmBtn.onclick = () => {

            if (onConfirm) onConfirm(); // Execute callback if provided

            document.body.removeChild(modalBackdrop); // Close modal

        };

    }

    cancelBtn.onclick = () => document.body.removeChild(modalBackdrop); // Close modal

}



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



        // V1 - Show autosave status briefly

        autosaveStatus.style.opacity = '1';

        setTimeout(() => { autosaveStatus.style.opacity = '0'; }, 1000);

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

 * Generates a specified number of random unique shoulder numbers for runners.

 * Updates the state and re-renders the runners page.

 */

function generateRandomRunners() {

    state.runners = [];

    const shoulderNumbers = new Set();

    while (shoulderNumbers.size < CONFIG.MAX_RUNNERS) {

        shoulderNumbers.add(Math.floor(Math.random() * 999) + 1); // Random number between 1 and 999

    }

    state.runners = Array.from(shoulderNumbers).map(num => ({ shoulderNumber: num }));

    saveState();

    render();

}



/**

 * Adds an empty runner entry to the state, allowing manual input.

 * Limits the total number of runners based on CONFIG.MAX_RUNNERS.

 */

function addRunner() {

    if (state.runners.length < CONFIG.MAX_RUNNERS) {

        state.runners.push({ shoulderNumber: '' }); // Add empty runner for input

        saveState();

        render();

    } else {

        showError(`לא ניתן להוסיף יותר מ-${CONFIG.MAX_RUNNERS} רצים.`);

    }

}



/**

 * Removes a runner from the state based on their index in the list.

 * @param {Event} event - The click event from the remove button.

 */

function removeRunner(event) {

    // Get the index from the button's data attribute

    state.runners.splice(parseInt(event.target.dataset.index), 1);

    saveState();

    render();

}



/**

 * V1 - Real-time validation for runner numbers on the runners page.

 * Checks for empty inputs, invalid numbers (non-positive), and duplicate shoulder numbers.

 * Displays error messages and highlights problematic inputs.

 * @returns {boolean} True if all runner numbers are valid, false otherwise.

 */

function validateRunnerNumbers() {

    const errorDiv = document.getElementById('runner-error');

    const runnerInputs = document.querySelectorAll('.runner-input');

    const shoulderNumbers = []; // To track duplicates

    let hasError = false;



    runnerInputs.forEach(input => {

        const num = parseInt(input.value);

        input.classList.remove('border-red-500', 'border-2'); // Clear previous error highlighting



        if (input.value.trim() === '') {

            showError("יש למלא את כל מספרי הכתף.");

            input.classList.add('border-red-500', 'border-2');

            hasError = true;

        } else if (isNaN(num) || num <= 0) {

            showError("מספר כתף לא תקין. יש להזין מספר חיובי.");

            input.classList.add('border-red-500', 'border-2');

            hasError = true;

        } else if (shoulderNumbers.includes(num)) {

            showError("מספרי כתף כפולים זוהו. יש לתקן לפני ההמשך.");

            input.classList.add('border-red-500', 'border-2');

            hasError = true;

        } else {

            shoulderNumbers.push(num); // Add to tracking list if valid so far

        }

    });



    // If no errors found, hide the error message

    if (!hasError) {

        errorDiv.textContent = '';

        errorDiv.classList.add('hidden');

    }



    return !hasError; // Return true if no errors

}



/**

 * Updates a runner's shoulder number in the state when an input field changes.

 * Triggers validation after each update.

 * @param {Event} event - The input event from the runner number field.

 */

function updateRunnerNumber(event) {

    const index = parseInt(event.target.dataset.index);

    state.runners[index].shoulderNumber = event.target.value === '' ? '' : parseInt(event.target.value);

    saveState();

    validateRunnerNumbers(); // Validate in real-time

}



/**

 * Validates evaluator and group details, then runner numbers, before starting heats.

 * If all validations pass, transitions to the heats page.

 */

function validateAndStartHeats() {

    const errorDiv = document.getElementById('runner-error');

    errorDiv.textContent = ''; // Clear previous errors

    errorDiv.classList.add('hidden');



    const evaluatorName = document.getElementById('evaluator-name').value.trim();

    const groupNumber = document.getElementById('group-number').value.trim();



    if (evaluatorName === '' || groupNumber === '') {

        return showError("יש למלא את כל פרטי ההערכה כדי להמשיך.");

    }

    if (state.runners.length === 0) {

        return showError("יש להזין לפחות רץ אחד כדי להתחיל.");

    }



    // V1 - Use the real-time validator before starting

    if (!validateRunnerNumbers()) {

        return; // Stop if validation fails

    }



    state.evaluatorName = evaluatorName;

    state.groupNumber = groupNumber;

    state.currentPage = PAGES.HEATS; // Navigate to heats page

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

    clearInterval(state.timer); // Stop the main timer interval

    state.isTimerRunning = false;

    targetHeat.finished = true; // Mark as finished

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

 * Handles selection/deselection of runners as stretcher carriers in sociometric heats.

 * @param {Event} event - The click event from the stretcher carrier button.

 */

function handleSociometricStretcherSelection(event) {

    const heat = state.sociometricStretcher.heats[state.sociometricStretcher.currentHeatIndex];

    const shoulderNumber = parseInt(event.currentTarget.dataset.shoulderNumber);

    const carriers = heat.stretcherCarriers;

    const jerricanCarriers = heat.jerricanCarriers;

    const existingIndex = carriers.findIndex(r => r.shoulderNumber === shoulderNumber);



    // Prevent selecting if already a jerrican carrier

    if (jerricanCarriers.some(r => r.shoulderNumber === shoulderNumber) && existingIndex === -1) {

        return;

    }



    if (existingIndex > -1) {

        // If already selected, remove them

        carriers.splice(existingIndex, 1);

    } else if (carriers.length < CONFIG.MAX_STRETCHER_CARRIERS) {

        // If not selected and limit not reached, add them

        carriers.push({ shoulderNumber });

    }

    saveState();

    render(); // Re-render to update button states

}



/**

 * Handles selection/deselection of runners as jerrican carriers in sociometric heats.

 * @param {Event} event - The click event from the jerrican carrier button.

 */

function handleSociometricJerricanSelection(event) {

    const heat = state.sociometricStretcher.heats[state.sociometricStretcher.currentHeatIndex];

    const shoulderNumber = parseInt(event.currentTarget.dataset.shoulderNumber);

    const carriers = heat.jerricanCarriers;

    const stretcherCarriers = heat.stretcherCarriers;

    const existingIndex = carriers.findIndex(r => r.shoulderNumber === shoulderNumber);



    // Prevent selecting if already a stretcher carrier

    if (stretcherCarriers.some(r => r.shoulderNumber === shoulderNumber) && existingIndex === -1) {

        return;

    }



    if (existingIndex > -1) {

        // If already selected, remove them

        carriers.splice(existingIndex, 1);

    } else if (carriers.length < CONFIG.MAX_JERRICAN_CARRIERS) {

        // If not selected and limit not reached, add them

        carriers.push({ shoulderNumber });

    }

    saveState();

    render(); // Re-render to update button states

}



/**

 * Updates a general comment for a runner in the current sociometric heat.

 * @param {Event} event - The input event from the comment textarea.

 */

function handleSociometricComment(event) {

    const heat = state.sociometricStretcher.heats[state.sociometricStretcher.currentHeatIndex];

    heat.allRunnersComments[parseInt(event.currentTarget.dataset.shoulderNumber)] = event.currentTarget.value;

    saveState();

}



// --- Score Calculation ---

/**
 * Computes per-heat sprint results: rank and relative score (1-7) per runner.
 * Winner gets 7. Others get 7 * (fastestTime / runnerTime), clamped to [1..7].
 * @param {object} heat
 * @returns {Array<{shoulderNumber:number, finishTime:number, rank:number, score:number, comment?:string}>}
 */
function getSprintHeatResults(heat) {
    // Finished, active arrivals only
    const finished = heat.arrivals
        .filter(a => a.status === 'active' && typeof a.finishTime === 'number' && a.finishTime > 0)
        .sort((a, b) => a.finishTime - b.finishTime);

    if (finished.length === 0) return [];

    const fastest = finished[0].finishTime;

    return finished.map((a, idx) => {
        const ratio = fastest / a.finishTime; // <= 1
        const score = Math.max(1, Math.round(7 * ratio));
        return { shoulderNumber: a.shoulderNumber, finishTime: a.finishTime, rank: idx + 1, score, comment: a.comment || '' };
    });
}

/** תוצאות מקצה ספרינט-זחילות לפי זמן יחסי (כמו בספרינטים) */
function getCrawlingSprintHeatResults(sprint) {
    const finished = sprint.arrivals
        .filter(a => a.status === 'active' && typeof a.finishTime === 'number' && a.finishTime > 0)
        .sort((a, b) => a.finishTime - b.finishTime);
    if (finished.length === 0) return [];
    const fastest = finished[0].finishTime;
    return finished.map((a, idx) => {
        const ratio = fastest / a.finishTime;
        const score = Math.max(1, Math.round(7 * ratio)); // 1..7
        return { shoulderNumber: a.shoulderNumber, finishTime: a.finishTime, rank: idx + 1, score, comment: a.comment || '' };
    });
}

/**
 * Calculates the final sprint score for a runner as the average of per-heat relative scores.
 * Winner in a heat gets 7; others are proportional to (fastest / time). Min score per heat is 1.
 * @param {object} runner
 * @returns {number} Average rounded to nearest integer in [1..7]
 */
function calculateSprintFinalScore(runner) {
    const perHeatScores = state.heats.flatMap(heat => {
        const results = getSprintHeatResults(heat);
        const entry = results.find(r => r.shoulderNumber === runner.shoulderNumber);
        return entry ? [entry.score] : [];
    });

    if (perHeatScores.length === 0) return 1;
    const avg = perHeatScores.reduce((s, v) => s + v, 0) / perHeatScores.length;
    return Math.min(7, Math.max(1, Math.round(avg)));
}

/**
 * Calculates the crawling sprint score for a given runner.
 * Similar to sprint score, but for crawling sprints.
 * @param {object} runner - The runner object.
 * @returns {number} The normalized crawling sprint score (1-7).
 */

function getCrawlingSprintScore(runner) {
    const perHeatScores = state.crawlingDrills.sprints.flatMap(sprint => {
        const results = getCrawlingSprintHeatResults(sprint);
        const entry = results.find(r => r.shoulderNumber === runner.shoulderNumber);
        return entry ? [entry.score] : [];
    });
    if (perHeatScores.length === 0) return 1;
    const avg = perHeatScores.reduce((s, v) => s + v, 0) / perHeatScores.length;
    return Math.min(7, Math.max(1, Math.round(avg)));
}

/**

 * Calculates the sack carrying score for a given runner.

 * A longer sack carry time should result in a higher score.

 * @param {object} runner - The runner object.

 * @returns {number} The normalized sack carrying score (1-7).

 */

function getSackCarryScore(runner) {

    const sackTime = state.crawlingDrills.sackCarriers[runner.shoulderNumber]?.totalTime || 0;

    const allSackTimes = Object.values(state.crawlingDrills.sackCarriers).map(c => c.totalTime);

    const maxSackTime = Math.max(...allSackTimes, 0);



    // Normalize sack time: longer time maps to higher score.

    return normalizeScore(sackTime, 0, maxSackTime);

}



/**

 * Calculates the overall crawling drills final score for a given runner.

 * This combines sack carrying time and crawling sprint performance.

 * Updated for V1.11: 50% for crawling sprints, 50% for sack carry time.

 * @param {object} runner - The runner object.

 * @returns {number} The rounded average of sack score and crawling sprint score (1-7).

 */

function calculateCrawlingFinalScore(runner) {

    if (state.crawlingDrills.runnerStatuses[runner.shoulderNumber]) {

        return 1;

    }

    const sprintScore = getCrawlingSprintScore(runner);

    const sackScore = getSackCarryScore(runner);



    return Math.round((sprintScore + sackScore) / 2);

}

/**
 * Calculates the sociometric final score based on the number of selections.
 * Stretcher carries are weighted higher than jerrican carries.
 * @param {object} runner - The runner object.
 * @returns {number} The normalized score (1-7).
 */
function calculateStretcherFinalScore(runner) {
    if (state.crawlingDrills.runnerStatuses[runner.shoulderNumber]) {
        return 1;
    }

    // Count selections across all heats from the new 'selections' object
    const stretcherCount = state.sociometricStretcher.heats.filter(h => h.selections && h.selections[runner.shoulderNumber] === 'stretcher').length;
    const jerricanCount = state.sociometricStretcher.heats.filter(h => h.selections && h.selections[runner.shoulderNumber] === 'jerrican').length;

    // Apply weighting
    const totalWeightedCarries = (stretcherCount * 1.14) + (jerricanCount * 0.57);

    // Collect total carries for all runners to determine min/max for normalization
    const allWeightedCarries = state.runners.map(r => {
        if (state.crawlingDrills.runnerStatuses[r.shoulderNumber]) return 0;
        const sCount = state.sociometricStretcher.heats.filter(h => h.selections && h.selections[r.shoulderNumber] === 'stretcher').length;
        const jCount = state.sociometricStretcher.heats.filter(h => h.selections && h.selections[r.shoulderNumber] === 'jerrican').length;
        return (sCount * 1.14) + (jCount * 0.57);
    });

    const maxCarries = Math.max(...allWeightedCarries, 0);
    const minCarries = 0; // The minimum possible score is always 0 carries

    return normalizeScore(totalWeightedCarries, minCarries, maxCarries);
}

// --- Page Rendering ---



/**

 * Main rendering function that clears the content and renders the appropriate page

 * based on the current state.currentPage.

 * Also manages global timer state and navigation tab highlighting.

 */

function render() {

    contentDiv.innerHTML = ''; // Clear existing content
    document.getElementById('footer-navigation').innerHTML = ''; // Clear footer

    // Clear main timer if it's running
    if (state.timer) clearInterval(state.timer);
    state.isTimerRunning = false;

    // Stop all sack timers unless on the crawling comments page
    if (state.currentPage !== PAGES.CRAWLING_COMMENTS) stopAllSackTimers();

    // האם יש קבוצה? לפחות רץ אחד ב-state
    const shouldShowQuickBar =
        state.runners && state.runners.length > 0 &&
        state.currentPage !== PAGES.RUNNERS; // אל תציג במסך יצירת קבוצה

    // הסתרת הבר הישן למעלה והצגת בועה
    const quickBarDiv = document.getElementById('quick-comment-bar-container');
    if (quickBarDiv) { quickBarDiv.innerHTML = ''; quickBarDiv.style.display = 'none'; }

    // renderQuickCommentBar(shouldShowQuickBar); // הוסר: לא להציג את השורה העליונה
    renderQuickCommentFAB(shouldShowQuickBar);



    // Update active navigation tab highlighting

    document.querySelectorAll('.nav-tab').forEach(tab => {

        const isCurrent = tab.dataset.page === state.currentPage;

        tab.classList.toggle('border-blue-500', isCurrent);

        tab.classList.toggle('text-blue-500', isCurrent);

        tab.classList.toggle('border-transparent', !isCurrent);

        tab.classList.toggle('text-gray-600', !isCurrent);

    });



    // Dynamically update the stretcher page tab label from CONFIG

    const stretcherTab = document.querySelector('.nav-tab[data-page="sociometric-stretcher-heat"] span:last-child');

    if (stretcherTab) {

        stretcherTab.textContent = CONFIG.STRETCHER_PAGE_LABEL;

    }



    // Store the current page as lastPage, unless it's a transient page like status or admin settings

    if (state.currentPage !== PAGES.STATUS_MANAGEMENT && state.currentPage !== PAGES.ADMIN_SETTINGS) {

        state.lastPage = state.currentPage;

    }



    // Call the specific rendering function for the current page

    switch (state.currentPage) {

        case PAGES.RUNNERS: renderRunnersPage(); break;

        case PAGES.ADMIN_SETTINGS: renderAdminSettingsPage(); break;

        case PAGES.STATUS_MANAGEMENT: renderStatusManagementPage(); break;

        case PAGES.HEATS: renderHeatPage(state.currentHeatIndex); break;

        case PAGES.CRAWLING_COMMENTS: renderCrawlingDrillsCommentsPage(); break;

        case PAGES.CRAWLING_SPRINT: renderCrawlingSprintPage(state.crawlingDrills.currentSprintIndex); break;

        case PAGES.STRETCHER_HEAT: renderSociometricStretcherHeatPage(state.sociometricStretcher.currentHeatIndex); break;

        case PAGES.REPORT: renderReportPage(); break;

    }

}



/**

 * Renders the "Runners" page, allowing management of runner shoulder numbers,

 * evaluator details, and app settings/backup.

 */

function renderRunnersPage() {

    headerTitle.textContent = 'ניהול קבוצה'; // Update header title



    const todayDate = new Date().toLocaleDateString('he-IL');

    const currentTime = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });



    contentDiv.innerHTML = `

    <h2 class="text-xl font-semibold mb-4 text-center text-blue-500">פרטי הערכה</h2>

    <div class="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg shadow-inner">

        <div class="flex flex-col md:flex-row items-center md:items-baseline space-y-2 md:space-y-0 md:space-x-4 md:space-x-reverse">

            <div class="flex-grow w-full"><label for="evaluator-name" class="block text-right mb-1 required-field text-sm">שם המעריך:</label><input type="text" id="evaluator-name" value="${state.evaluatorName}" class="w-full p-2 border border-gray-300 rounded-lg text-lg text-right" placeholder="הכנס שם מעריך"></div>

            <div class="flex-grow w-full"><label for="group-number" class="block text-right mb-1 required-field text-sm">מספר קבוצה:</label><input type="text" id="group-number" value="${state.groupNumber}" class="w-full p-2 border border-gray-300 rounded-lg text-lg text-right" placeholder="הכנס מספר קבוצה"></div>

        </div>

        <div class="flex justify-between items-center text-gray-600 font-medium text-sm"><span><strong>תאריך:</strong> ${todayDate}</span><span><strong>שעה:</strong> ${currentTime}</span></div>

    </div>

    <h2 class="text-xl font-semibold mb-4 text-center text-blue-500">הזן מספרי כתף של רצים (עד ${CONFIG.MAX_RUNNERS})</h2>

    <div class="mb-4 flex flex-col md:flex-row justify-center items-center space-y-2 md:space-y-0 md:space-x-2 md:space-x-reverse">

        <button id="generate-random-btn" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md w-full md:w-auto">צור מספרי כתף רנדומליים</button>

        <button id="add-runner-btn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md w-full md:w-auto">הוסף רץ ידנית</button>

    </div>

    <div id="runner-list" class="space-y-2"></div>

    <div class="flex justify-center mt-6"><button id="start-heats-btn" class="bg-green-600 hover:bg-green-700 text-white text-xl font-bold py-3 px-6 rounded-lg shadow-lg w-full">התחל מקצים</button></div>

    <div id="runner-error" class="mt-4 text-red-500 text-center font-bold hidden"></div>

    <div class="mt-8 border-t pt-4 border-gray-300">

        <h3 class="text-lg font-semibold mb-3 text-center text-gray-700">ניהול נתונים</h3>

        <div class="flex justify-center gap-4 flex-wrap">

            <button id="admin-settings-btn" class="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-lg text-sm">הגדרות מנהל</button>

            <button id="export-backup-btn" class="bg-blue-800 hover:bg-blue-900 text-white font-bold py-2 px-4 rounded-lg text-sm">ייצא גיבוי (JSON)</button>

            <input type="file" id="import-backup-input" class="hidden" accept=".json">

            <button id="import-backup-btn" class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg text-sm">ייבא גיבוי (JSON)</button>

            <button id="reset-app-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg text-sm">אפס אפליקציה</button>

        </div>

    </div>`;



    const runnerList = document.getElementById('runner-list');

    const template = document.getElementById('runner-row-template');



    // Populate runner list from state.runners

    state.runners.forEach((runner, index) => {

        const clone = template.content.cloneNode(true);

        clone.querySelector('.runner-index').textContent = `${index + 1}.`;

        const input = clone.querySelector('.runner-input');

        input.value = runner.shoulderNumber;

        input.dataset.index = index; // Store index for updates

        const removeBtn = clone.querySelector('.remove-runner-btn');

        removeBtn.dataset.index = index; // Store index for removal



        // Add event listeners for input and remove button

        input.addEventListener('input', updateRunnerNumber);

        removeBtn.addEventListener('click', removeRunner);

        runnerList.appendChild(clone);

    });



    // Add event listeners for evaluator and group inputs

    document.getElementById('evaluator-name').addEventListener('input', (e) => { state.evaluatorName = e.target.value; saveState(); });

    document.getElementById('group-number').addEventListener('input', (e) => { state.groupNumber = e.target.value; saveState(); });



    // Add event listeners for action buttons

    document.getElementById('generate-random-btn').addEventListener('click', generateRandomRunners);

    document.getElementById('add-runner-btn').addEventListener('click', addRunner);

    document.getElementById('start-heats-btn').addEventListener('click', validateAndStartHeats);

    document.getElementById('admin-settings-btn').addEventListener('click', handleAdminSettingsClick);



    // Reset app button with confirmation modal

    document.getElementById('reset-app-btn').addEventListener('click', () => showModal('איפוס אפליקציה', 'האם אתה בטוח? כל הנתונים יימחקו לצמיתות.', () => {

        localStorage.removeItem(CONFIG.APP_STATE_KEY); // Clear localStorage

        // Reset CONFIG to default values

        CONFIG = { NUM_HEATS: 14, MAX_CRAWLING_SPRINTS: 4, MAX_RUNNERS: 20, MAX_SACK_CARRIERS: 3, NUM_STRETCHER_HEATS: 8, MAX_STRETCHER_CARRIERS: 4, MAX_JERRICAN_CARRIERS: 3, STRETCHER_PAGE_LABEL: 'אלונקות', STRETCHER_CARRIER_NOUN_PLURAL: 'רצים שלקחו אלונקה', APP_STATE_KEY: 'sprintAppState_v1.11' };

        state.currentPage = PAGES.RUNNERS; // Go back to runners page

        initializeAllData(); // Re-initialize all state data

        saveState(); // Save the new config and reset state

        render(); // Re-render the UI

    }));



    // Backup/Restore buttons

    document.getElementById('export-backup-btn').addEventListener('click', exportBackup);

    document.getElementById('import-backup-btn').addEventListener('click', () => document.getElementById('import-backup-input').click());

    document.getElementById('import-backup-input').addEventListener('change', importBackup);


}



/**

 * Renders the "Admin Settings" page, allowing modification of core application configurations.

 * Warns the user that changes will reset all data.

 */

function renderAdminSettingsPage() {

    headerTitle.textContent = 'הגדרות מנהל'; // Update header title



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

    // Event listener for saving settings with confirmation

    document.getElementById('save-settings-btn').addEventListener('click', () => {

        showModal('אישור שינוי הגדרות', 'פעולה זו תאפס את כל נתוני הגיבוש (רצים, מקצים, הערות וכו\'). האם אתה בטוח שברצונך להמשיך?', () => {

            // Update CONFIG values from input fields

            CONFIG.MAX_RUNNERS = parseInt(document.getElementById('setting-max-runners').value) || CONFIG.MAX_RUNNERS;

            CONFIG.NUM_HEATS = parseInt(document.getElementById('setting-num-heats').value) || CONFIG.NUM_HEATS;

            CONFIG.MAX_CRAWLING_SPRINTS = parseInt(document.getElementById('setting-crawling-sprints').value) || CONFIG.MAX_CRAWLING_SPRINTS;

            CONFIG.NUM_STRETCHER_HEATS = parseInt(document.getElementById('setting-stretcher-heats').value) || CONFIG.NUM_STRETCHER_HEATS;

            CONFIG.MAX_STRETCHER_CARRIERS = parseInt(document.getElementById('setting-max-stretcher-carriers').value) || CONFIG.MAX_STRETCHER_CARRIERS;

            CONFIG.MAX_JERRICAN_CARRIERS = parseInt(document.getElementById('setting-max-jerrican-carriers').value) || CONFIG.MAX_JERRICAN_CARRIERS;

            CONFIG.STRETCHER_PAGE_LABEL = document.getElementById('setting-stretcher-page-label').value.trim() || CONFIG.STRETCHER_PAGE_LABEL;

            CONFIG.STRETCHER_CARRIER_NOUN_PLURAL = document.getElementById('setting-stretcher-carrier-noun-plural').value.trim() || CONFIG.STRETCHER_CARRIER_NOUN_PLURAL;



            state.currentPage = PAGES.RUNNERS; // Navigate back to runners page

            initializeAllData(); // Reset all application data due to config change

            saveState(); // Save the new config and reset state

            render(); // Re-render the UI

            showModal('הגדרות נשמרו', 'ההגדרות נשמרו ונתוני הגיבוש אופסו.');

        });

    });



    // Event listener for canceling settings change

    document.getElementById('cancel-settings-btn').addEventListener('click', () => {

        state.currentPage = state.lastPage; // Go back to the last non-admin/status page

        render();

    });

}


function renderQuickCommentBar(show) {
    const quickBarDiv = document.getElementById('quick-comment-bar-container');
    if (!show) { quickBarDiv.innerHTML = ''; return; }

    // הזרקת CSS פעם אחת עבור המיקרופון והבר
    if (!document.getElementById('qc-style')) {
        const style = document.createElement('style');
        style.id = 'qc-style';
        style.textContent = `
.quickbar { display:flex; gap:12px; align-items:center; }
.quickbar .qc-group{ display:flex; align-items:center; gap:8px; min-width:0; }
.quickbar .qc-input-wrap{ position:relative; display:flex; align-items:center; flex:1 1 auto; min-width:0; }
.quickbar .qc-input{
  width:100%; height:44px; line-height:44px; font-size:16px; text-align:right;
  padding:8px 12px; padding-right:46px; /* מקום לאייקון */
  border:1px solid rgba(255,255,255,.1); border-radius:10px;
  background: rgba(255,255,255,.06); color:inherit; box-sizing:border-box;
}
.quickbar .qc-micBtn.mic-inside{
  position:absolute; right:6px; top:50%; transform:translateY(-50%);
  width:36px; height:36px; display:flex; align-items:center; justify-content:center;
  border-radius:8px; background:#374151; color:#fff; border:1px solid rgba(255,255,255,.1);
  cursor:pointer; -webkit-tap-highlight-color:transparent;
}
.quickbar .qc-micBtn.mic-inside:hover{ background:#4b5563; }
.quickbar .qc-micBtn.mic-inside.recording{ background:#ef4444; border-color:#dc2626; }
.quickbar .qc-runner-select{ width:92px; min-width:84px; text-align:center; text-align-last:center; font-weight:600; }
.qc-sendBtn[disabled]{ opacity:.5; cursor:not-allowed; }
        `;
        document.head.appendChild(style);
    }

    const runnerOptions = state.runners
        .slice()
        .sort((a, b) => a.shoulderNumber - b.shoulderNumber)
        .map(r => `<option value="${r.shoulderNumber}">${r.shoulderNumber}</option>`).join('');

    quickBarDiv.innerHTML = `
      <div class="quickbar" role="region" aria-label="הערה חפוזה">
        <div class="qc-group">
          <span class="qc-label">מספר כתף:</span>
          <select id="quick-comment-runner" class="qc-select qc-runner-select" aria-label="בחר מספר כתף">${runnerOptions}</select>
        </div>
        <div class="qc-group" style="flex:1">
          <span class="qc-label">הערה:</span>
          <div class="qc-input-wrap">
            <input id="quick-comment-input" type="text" class="qc-input" placeholder="הוסף הערה חפוזה...">
            <button id="quick-comment-mic" class="qc-micBtn mic-inside" aria-label="הכתבה קולית" title="הכתבה קולית">🎤</button>
          </div>
        </div>
        <div class="qc-actions">
          <button id="quick-comment-send" class="qc-sendBtn" disabled>שלח</button>
        </div>
      </div>`;

    const selectEl = document.getElementById('quick-comment-runner');
    const inputEl  = document.getElementById('quick-comment-input');
    const micBtn   = document.getElementById('quick-comment-mic');
    const sendBtn  = document.getElementById('quick-comment-send');

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    const updateSendEnabled = () => {
        const hasText = inputEl.value.trim().length > 0;
        sendBtn.disabled = !hasText;
    };
    inputEl.addEventListener('input', updateSendEnabled);
    inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sendBtn.disabled) send();
        }
    });

    function send() {
        const selected = selectEl.value;
        const text = inputEl.value.trim();
        if (!selected || !text) return;
        if (state.generalComments[selected]) {
            state.generalComments[selected] += ' | ' + text;
        } else {
            state.generalComments[selected] = text;
        }
        saveState();
        if (navigator.vibrate) navigator.vibrate(10);
        inputEl.value = '';
        inputEl.placeholder = 'נשמר!';
        updateSendEnabled();
        setTimeout(() => { inputEl.placeholder = 'הוסף הערה חפוזה...'; }, 900);
    }
    sendBtn.addEventListener('click', send);

    // דיבור/חלופה לאייפון (כפי שכבר יושם קודם)
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null, isRecording = false;

    if (SR) {
        recognition = new SR();
        recognition.lang = 'he-IL';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript || '';
            inputEl.value = transcript;
            updateSendEnabled();
        };
        recognition.onerror = () => {
            isRecording = false;
            micBtn.classList.remove('recording');
            micBtn.textContent = '🎤';
        };
        recognition.onend = () => {
            isRecording = false;
            micBtn.classList.remove('recording');
            micBtn.textContent = '🎤';
        };

        const startRec = (e) => {
            e.preventDefault();
            if (!isRecording) {
                try {
                    recognition.start();
                    isRecording = true;
                    micBtn.classList.add('recording');
                    micBtn.textContent = '🛑';
                } catch {}
            }
        };
        const stopRec = (e) => {
            e.preventDefault();
            if (isRecording) recognition.stop();
        };

        micBtn.addEventListener('mousedown', startRec);
        micBtn.addEventListener('mouseup', stopRec);
        micBtn.addEventListener('mouseleave', stopRec);
        micBtn.addEventListener('touchstart', startRec, { passive: false });
        micBtn.addEventListener('touchend', stopRec);
    } else {
        micBtn.title = isIOS
          ? "באייפון: מקסם מקלדת והשתמש בסמל 🎤 להכתבה."
          : "הקלטה קולית דורשת דפדפן תומך ו-HTTPS.";
        const startNative = (e) => { e.preventDefault(); micBtn.classList.add('recording'); micBtn.textContent = '🛑'; inputEl.focus(); };
        const stopNative  = (e) => { e.preventDefault(); micBtn.classList.remove('recording'); micBtn.textContent = '🎤'; };
        micBtn.addEventListener('mousedown', startNative);
        micBtn.addEventListener('mouseup', stopNative);
        micBtn.addEventListener('mouseleave', stopNative);
        micBtn.addEventListener('touchstart', startNative, { passive: false });
        micBtn.addEventListener('touchend', stopNative);
    }
}

/**

 * Renders the "Status Management" page, allowing global status changes for runners

 * Runners can be marked as 'temp_removed' (temporarily removed) or 'retired' (permanently retired).

 */

function renderStatusManagementPage() {

    headerTitle.textContent = 'סטטוס חיילים'; // Update header title

    contentDiv.innerHTML = `

    <h2 class="text-2xl font-semibold mb-4 text-center text-blue-500">ניהול סטטוס רצים</h2>

    <div class="bg-gray-100 p-4 rounded-lg shadow-inner my-6">

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

            ${state.runners
            .slice() // Create a copy for sorting
            .sort((a, b) => a.shoulderNumber - b.shoulderNumber)
            .map(runner => {

                // Determine current status and display properties

                const currentStatus = state.crawlingDrills.runnerStatuses[runner.shoulderNumber] || 'active';

                let revertBtnText = currentStatus === 'temp_removed' ? 'השב לפעילות' : 'בטל פרישה';

                let statusIcon = '';

                let statusText = '';

                let statusColorClass = '';



                if (currentStatus === 'active') {

                    statusIcon = '✅';

                    statusText = 'פעיל';

                    statusColorClass = 'text-green-500 dark:text-green-400';

                } else if (currentStatus === 'temp_removed') {

                    statusIcon = '⚠️';

                    statusText = 'גריעה זמנית';

                    statusColorClass = 'text-yellow-500 dark:text-yellow-400';

                } else { // retired

                    statusIcon = '⛔';

                    statusText = 'פרש';

                    statusColorClass = 'text-red-500 dark:text-red-400';

                }



                return `

                <div class="flex flex-col md:flex-row items-center md:space-x-2 md:space-x-reverse p-2 bg-white rounded-lg shadow-sm">

                    <span class="font-bold text-lg w-full md:w-1/4 text-center md:text-right">${runner.shoulderNumber}</span>

                    <div class="flex flex-row gap-2 w-full">
                        ${currentStatus === 'active' ? `
                            <button class="status-btn flex-1 min-w-[110px] py-2 px-2 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold rounded-lg flex items-center justify-center" data-shoulder-number="${runner.shoulderNumber}" data-status="temp_removed">
                                <span>⚠️</span><span class="ml-1">יצא לבדיקה</span>
                            </button>
                            <button class="status-btn flex-1 min-w-[110px] py-2 px-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg flex items-center justify-center" data-shoulder-number="${runner.shoulderNumber}" data-status="retired">
                                <span>⛔</span><span class="ml-1">פרש</span>
                            </button>
                        ` : `
                            <span class="text-sm ${statusColorClass} flex-1 text-center flex items-center justify-center">${statusIcon}<span class="ml-1">${statusText}</span></span>
                            <button class="status-btn flex-1 min-w-[110px] py-2 px-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg flex items-center justify-center" data-shoulder-number="${runner.shoulderNumber}" data-status="active">
                                <span>✅</span><span class="ml-1">${revertBtnText}</span>
                            </button>
                        `}
                    </div>

                </div>`;

            }).join('')}

        </div>

    </div>`;



    // Attach event listeners to all status change buttons

    document.querySelectorAll('.status-btn').forEach(btn => btn.addEventListener('click', (e) => handleGlobalStatusChange(e, null)));



    // Add navigation buttons at the bottom

    contentDiv.insertAdjacentHTML('beforeend', `

    <div class="flex justify-between items-center my-4 p-2 bg-gray-200 rounded-lg shadow-inner">

        <button id="back-btn" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg"><span class="text-xl">&larr;</span> חזור</button>

        <button id="group-manage-btn" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">ניהול קבוצה <span class="text-xl">&rarr;</span></button>

    </div>`);



    // Event listeners for navigation

    document.getElementById('back-btn').addEventListener('click', () => { state.currentPage = state.lastPage; render(); });

    document.getElementById('group-manage-btn').addEventListener('click', () => { state.currentPage = PAGES.RUNNERS; render(); });


}



/**

 * Renders a specific sprint heat page, including timer, runner arrival buttons,

 * and a list of arrived runners with their times and comments.

 * @param {number} heatIndex - The index of the heat to render.

 */

function renderHeatPage(heatIndex) {

    const heat = state.heats[heatIndex];

    headerTitle.textContent = `מקצה ספרינט ${heat.heatNumber}`; // Update header title

    // Filter active runners who have not yet arrived in this heat and sort them
    const activeRunners = state.runners
        .filter(runner =>
            runner.shoulderNumber && // Ensure runner has a shoulder number
            !heat.arrivals.some(arrival => arrival.shoulderNumber === runner.shoulderNumber) && // Not already arrived
            !state.crawlingDrills.runnerStatuses[runner.shoulderNumber] // Not globally inactive
        )
        .sort((a, b) => a.shoulderNumber - b.shoulderNumber);

    contentDiv.innerHTML = `

    <div id="timer-display" class="text-4xl md:text-6xl font-mono my-6 text-center timer-display" aria-live="polite">00:00:000</div>
    <div class="flex justify-between items-center my-4 p-2 rounded-lg shadow-inner sticky-bottom">
        ${heatIndex > 0 ? `<button id="prev-heat-btn-inline" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg"><span class="text-xl">&larr;</span> קודם</button>` : '<div></div>'}
        <span>מקצה ספרינט ${heatIndex + 1}/${CONFIG.NUM_HEATS}</span>
        ${heatIndex < CONFIG.NUM_HEATS - 1 ? `<button id="next-heat-btn-inline" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">הבא <span class="text-xl">&rarr;</span></button>` : `<button id="next-heat-btn-inline" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">למסך זחילות<span class="text-xl">&rarr;</span></button>`}
    </div>

    <div class="flex justify-center space-x-2 space-x-reverse my-4 flex-wrap">

        <button id="start-btn" class="bg-green-500 hover:bg-green-600 text-white text-base md:text-xl font-bold py-2 px-4 md:py-4 md:px-8 rounded-lg ${heat.started ? 'hidden' : ''}">התחל</button>

        <button id="stop-btn" class="bg-red-500 hover:bg-red-600 text-white text-base md:text-xl font-bold py-2 px-4 md:py-4 md:px-8 rounded-lg ${!heat.started || heat.finished ? 'hidden' : ''}">סיים</button>

        <button id="undo-btn" class="bg-yellow-500 hover:bg-yellow-600 text-white text-base md:text-xl font-bold py-2 px-4 md:py-4 md:px-8 rounded-lg ${!heat.started || heat.finished || heat.arrivals.length === 0 ? 'hidden' : ''}">בטל הגעה אחרונה</button>

    </div>

    <div id="runner-buttons-container" class="my-6 ${!heat.started || heat.finished ? 'hidden' : ''}">
        <h3 class="text-base md:text-xl font-semibold mb-2 text-center text-gray-300">לחץ על מספר הכתף של הרץ שהגיע</h3>
        <div class="auto-grid">
            ${activeRunners.map(runner => `
                <button class="runner-btn bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-md text-xl md:text-2xl" data-shoulder-number="${runner.shoulderNumber}">
                    ${runner.shoulderNumber}
                </button>`).join('')}
        </div>
    </div>

    <div id="arrival-list" class="space-y-2">
            ${heat.arrivals.map((arrival, index) => `
            <div class="bg-white p-3 rounded-lg shadow-sm flex justify-between items-center">
                <span class="font-bold text-gray-700 text-sm md:text-base">${index + 1}. רץ ${arrival.shoulderNumber}</span>
                <span class="font-mono text-gray-500 text-sm md:text-base">${arrival.finishTime ? formatTime(arrival.finishTime) : arrival.comment}</span>
            </div>`).join('')}
        </div>
    </div>`;

    // Start timer if heat is started and not finished, otherwise update display with last time

    if (heat.started && !heat.finished) startTimer();

    else updateTimerDisplay(heat.arrivals.length > 0 ? heat.arrivals[heat.arrivals.length - 1].finishTime : 0);



    // Attach event listeners to buttons

    document.getElementById('start-btn')?.addEventListener('click', () => handleStart(heat));

    document.getElementById('stop-btn')?.addEventListener('click', () => handleStop(heat));

    document.getElementById('undo-btn')?.addEventListener('click', () => handleUndoArrival(heat));

    document.getElementById('runner-buttons-container')?.addEventListener('click', (e) => handleAddRunnerToHeat(e, heat, state.currentHeatIndex));



    // Attach event listeners to comment inputs

    contentDiv.querySelectorAll('.comment-input').forEach(input => input.addEventListener('change', (e) => updateComment(e, heat)));



    // Navigation between heats

    document.getElementById('prev-heat-btn-inline')?.addEventListener('click', () => { state.currentHeatIndex--; saveState(); render(); });

    document.getElementById('next-heat-btn-inline')?.addEventListener('click', () => {

        if (state.currentHeatIndex < CONFIG.NUM_HEATS - 1) {

            state.currentHeatIndex++;

        } else {

            // If last heat, navigate to crawling comments page

            state.currentPage = PAGES.CRAWLING_COMMENTS;

        }

        saveState();

        render();

    });

}



/**

 * Renders the "Crawling Drills Comments" page, allowing general comments for runners

 * and managing sack carriers with their individual timers.

 */

function renderCrawlingDrillsCommentsPage() {
    headerTitle.textContent = 'תרגילי זחילה - הערות כלליות';

    const activeRunners = state.runners
        .filter(runner => runner.shoulderNumber && !state.crawlingDrills.runnerStatuses[runner.shoulderNumber])
        .sort((a, b) => a.shoulderNumber - b.shoulderNumber);

    activeRunners.forEach(runner => {
        if (state.crawlingDrills.activeSackCarriers.includes(runner.shoulderNumber)) {
            startSackTimer(runner.shoulderNumber);
        }
    });

    const commentsHtml = activeRunners.map(runner => {
        const sackData = state.crawlingDrills.sackCarriers[runner.shoulderNumber];
        const sackTime = sackData ? formatTime_no_ms(sackData.totalTime + (sackData.startTime ? Date.now() - sackData.startTime : 0)) : '00:00';
        const generalComment = state.generalComments[runner.shoulderNumber] || '';
        return `
        <div class="p-3 bg-white rounded-lg shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div class="text-lg font-bold"> ${runner.shoulderNumber}</div>
            <div class="flex-grow flex items-center space-x-2 space-x-reverse w-full">
                <span class="text-sm font-semibold whitespace-nowrap">שק:</span>
                <span id="sack-timer-${runner.shoulderNumber}" class="text-lg font-mono text-gray-700">${sackTime}</span>
            </div>
            <div class="flex-grow w-full">
                <textarea class="comment-area w-full p-2 border border-gray-200 rounded-md text-sm text-right" data-shoulder-number="${runner.shoulderNumber}" placeholder="הערה כללית...">${generalComment}</textarea>
            </div>
        </div>`;
    }).join('');

    // Generate HTML for sack carrier selection buttons
    const sackCarrierHtml = `
<div id="sack-carrier-container" class="my-6 p-4 rounded-lg">
    <h3 class="text-xl font-semibold mb-4 text-center">בחר את נושאי השק (עד ${CONFIG.MAX_SACK_CARRIERS})</h3>
    <div class="auto-grid">
        ${activeRunners.map(runner => {
        const isSelected = state.crawlingDrills.activeSackCarriers.includes(runner.shoulderNumber);
        const canSelect = isSelected || state.crawlingDrills.activeSackCarriers.length < CONFIG.MAX_SACK_CARRIERS;
        return `<button class="runner-sack-btn ${isSelected ? 'selected' : ''} bg-gray-300 hover:bg-gray-400 font-bold text-xl" data-shoulder-number="${runner.shoulderNumber}" ${!canSelect ? 'disabled' : ''}>
                        ${runner.shoulderNumber} <span>🎒</span>
                    </button>`;
    }).join('')}
    </div>
</div>`;


    contentDiv.innerHTML = `
<h2 class="text-2xl font-semibold mb-4 text-center mt-6 text-blue-500">ניהול נשיאת שק</h2>
${sackCarrierHtml}
<div class="space-y-4 mb-6">${commentsHtml}</div>
<div class="flex justify-between items-center my-4 p-2 bg-gray-200 rounded-lg shadow-inner">
    <div></div><span>זחילות מתמשך 1/1</span>
    <button id="next-crawl-btn-inline" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">התחל ספרינט זחילות <span class="text-xl">&rarr;</span></button>
</div>`;



    // Attach event listeners for comment textareas

    document.querySelectorAll('.comment-area').forEach(textarea => {
        textarea.addEventListener('input', (e) => {
            state.generalComments[e.target.dataset.shoulderNumber] = e.target.value;
            saveState();
        });
    });



    // Attach event listeners for sack carrier toggle buttons

    document.querySelectorAll('.runner-sack-btn').forEach(btn => btn.addEventListener('click', handleSackCarrierToggle));



    // Navigation to crawling sprint page

    document.getElementById('next-crawl-btn-inline').addEventListener('click', () => {
        const go = () => {
            state.currentPage = PAGES.CRAWLING_SPRINT;
            state.crawlingDrills.currentSprintIndex = 0;
            saveState();
            render();
        };
        const intercepted = confirmLeaveCrawlingComments(go);
        if (!intercepted) go();
    });

}



/**

 * Renders a specific crawling sprint page, similar to sprint heats but for crawling.

 * Includes timer, runner arrival buttons, and a list of arrived runners.

 * @param {number} sprintIndex - The index of the crawling sprint to render.

 */

function renderCrawlingSprintPage(sprintIndex) {
    const sprint = state.crawlingDrills.sprints[sprintIndex];
    headerTitle.textContent = `מקצה זחילה ${sprint.heatNumber}`;

    const activeRunners = state.runners
        .filter(r => r.shoulderNumber && !state.crawlingDrills.runnerStatuses[r.shoulderNumber] && !sprint.arrivals.some(a => a.shoulderNumber === r.shoulderNumber))
        .sort((a, b) => a.shoulderNumber - b.shoulderNumber);

        contentDiv.innerHTML = `
        <div id="timer-display" class="text-4xl md:text-6xl font-mono my-6 text-center timer-display" aria-live="polite">00:00</div>
        <div class="flex justify-between items-center my-4 p-2 rounded-lg shadow-inner sticky-bottom">
            ${sprintIndex > 0 ? `<button id="prev-crawling-sprint-btn-inline" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg"><span class="text-xl">&larr;</span> קודם</button>` : '<div></div>'}
            <span>מקצה זחילה ${sprintIndex + 1}/${CONFIG.MAX_CRAWLING_SPRINTS}</span>
            ${sprintIndex < CONFIG.MAX_CRAWLING_SPRINTS - 1 ? `<button id="next-crawling-sprint-btn-inline" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">הבא <span class="text-xl">&rarr;</span></button>` : `<button id="next-crawling-sprint-btn-inline" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">${CONFIG.STRETCHER_PAGE_LABEL} <span class="text-xl">&rarr;</span></button>`}
        </div>
        <div class="flex justify-center space-x-2 space-x-reverse my-4 flex-wrap">
            <button id="start-btn" class="bg-green-500 hover:bg-green-600 text-white text-base md:text-xl font-bold py-2 px-4 rounded-lg ${sprint.started ? 'hidden' : ''}">התחל</button>
            <button id="stop-btn" class="bg-red-500 hover:bg-red-600 text-white text-base md:text-xl font-bold py-2 px-4 rounded-lg ${!sprint.started || sprint.finished ? 'hidden' : ''}">סיים</button>
            <button id="undo-btn" class="bg-yellow-500 hover:bg-yellow-600 text-white text-base md:text-xl font-bold py-2 px-4 rounded-lg ${!sprint.started || sprint.finished || sprint.arrivals.length === 0 ? 'hidden' : ''}">בטל הגעה אחרונה</button>
        </div>
        <div id="runner-buttons-container" class="my-6 ${!sprint.started || sprint.finished ? 'hidden' : ''}">
            <h3 class="text-base md:text-xl font-semibold mb-2 text-center">לחץ על מספר הכתף של הרץ שהגיע</h3>
            <div class="auto-grid">${activeRunners.map(r => `<button class="runner-btn bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg text-xl" data-shoulder-number="${r.shoulderNumber}">${r.shoulderNumber}</button>`).join('')}</div>
        </div>`;


    // Start timer if sprint is started and not finished, otherwise update display

    if (sprint.started && !sprint.finished) startTimer();

    else updateTimerDisplay(sprint.arrivals.length > 0 ? sprint.arrivals[sprint.arrivals.length - 1].finishTime : 0, false);


    // Attach event listeners

    document.getElementById('start-btn')?.addEventListener('click', () => handleStart(sprint));

    document.getElementById('stop-btn')?.addEventListener('click', () => { handleStop(sprint); });

    document.getElementById('undo-btn')?.addEventListener('click', () => handleUndoArrival(sprint));

    document.getElementById('runner-buttons-container')?.addEventListener('click', (e) => handleAddRunnerToHeat(e, sprint, -1));

    document.getElementById('next-crawling-sprint-btn-inline').addEventListener('click', () => {
        if (sprintIndex < CONFIG.MAX_CRAWLING_SPRINTS - 1) {
            state.crawlingDrills.currentSprintIndex++;
        } else {
            // If last crawling sprint, navigate to sociometric stretcher page
            state.currentPage = PAGES.STRETCHER_HEAT;
            state.sociometricStretcher.currentHeatIndex = 0; // Start from the first stretcher heat
        }
        saveState();
        render();
    });
}

/**

 * Renders the "Report" page, displaying summary tables for active and inactive runners,

 * including their calculated scores and status. Provides an option to export data to Excel.

 */

function renderReportPage() {
    headerTitle.textContent = 'דוח מסכם'; // עדכון כותרת
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
    // מאזינים לעריכת ציונים
    contentDiv.querySelectorAll('input[type="number"], textarea').forEach(input => {
        input.addEventListener('input', (e) => {
            if (!state.isEditingScores) return;
            const shoulder = e.target.dataset.shoulder;
            const type = e.target.dataset.type;

            // Find the original calculated data for this runner
            const runnerData = allRunners.find(r => r.shoulderNumber == shoulder);
            if (!runnerData) return;

            // Ensure the manualScores object for the runner exists, initializing it with calculated scores if needed.
            if (!state.manualScores[shoulder]) {
                state.manualScores[shoulder] = {
                    sprint: runnerData.sprintScore,
                    crawl: runnerData.crawlingScore,
                    stretcher: runnerData.stretcherScore
                };
            }

            if (type === 'generalComment') {
                // If editing a comment, just update the comment state.
                state.generalComments[shoulder] = e.target.value;
            } else {
                // If editing a score, update the specific score in manualScores.
                state.manualScores[shoulder][type] = parseInt(e.target.value) || 1;
            }
            saveState();
        });
    });

    // כפתורי עריכה, שמירה וביטול
    document.getElementById('edit-scores-btn')?.addEventListener('click', () => {
        // יצירת גיבוי עמוק של הנתונים לפני עריכה
        tempStateBackup = {
            manualScores: JSON.parse(JSON.stringify(state.manualScores || {})),
            generalComments: JSON.parse(JSON.stringify(state.generalComments || {}))
        };
        state.isEditingScores = true;
        render();
    });

    document.getElementById('save-scores-btn')?.addEventListener('click', () => {
        state.isEditingScores = false;
        tempStateBackup = null; // ניקוי הגיבוי
        saveState();
        render();
    });

    document.getElementById('cancel-scores-btn')?.addEventListener('click', () => {
        // שחזור הנתונים מהגיבוי
        if (tempStateBackup) {
            state.manualScores = tempStateBackup.manualScores;
            state.generalComments = tempStateBackup.generalComments;
        }
        state.isEditingScores = false;
        tempStateBackup = null; // ניקוי הגיבוי
        render(); // רינדור מחדש ללא שמירת השינויים
    });

    // כפתור ייצוא לאקסל
    document.getElementById('export-excel-btn')?.addEventListener('click', exportToExcel);
}

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
                const row = sprintsSheet.addRow([r.rank, r.shoulderNumber, formatTime(r.finishTime), r.score, r.comment || '']);
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
                const row = crawlingSheet.addRow([r.rank, r.shoulderNumber, formatTime(r.finishTime), r.score, r.comment || '']);
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

    // Request a screen wake lock to prevent the screen from turning off

    try {

        if ('wakeLock' in navigator) {

            await navigator.wakeLock.request('screen');

        }

    } catch (err) {

        console.error(`Failed to acquire screen wake lock: ${err.name}, ${err.message}`);

    }


    // Event listener for navigation tabs

    document.querySelector('nav').addEventListener('click', (e) => {
        const target = e.target.closest('.nav-tab');
        if (target) {
            const nextPage = target.dataset.page;
            const intercepted = confirmLeaveCrawlingComments(() => { state.currentPage = nextPage; render(); });
            if (!intercepted) {
                state.currentPage = nextPage;
                render();
            }
        }
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (state.themeMode === 'auto') {
            applyTheme();
            render();
        }
    });

    // V1.1 - Event listener for theme toggle button

    document.getElementById('theme-toggle-btn').addEventListener('click', () => {
        if (state.themeMode === 'light') state.themeMode = 'dark';
        else if (state.themeMode === 'dark') state.themeMode = 'auto';
        else state.themeMode = 'light';
        applyTheme();
        saveState();
        render();
    });



    loadState(); // Load saved state from localStorage

    applyTheme(); // V1.1 - Apply loaded theme

    render(); // Initial render of the application



    // V1 - Start autosave timer to save state every 60 seconds

    setInterval(saveState, 60000);

}



// Initialize the application when the script loads

init();

const element = document.getElementById('some-id');
if (element) {
    element.addEventListener('click', () => { /* פעולה */ });
}

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // מונע מהדפפן להציג את הברירת מחדל שלו
    deferredPrompt = event;
    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
        installBtn.style.display = 'block';
        installBtn.onclick = async () => {
            installBtn.style.display = 'none';
            deferredPrompt.prompt();
            const choiceResult = await deferredPrompt.userChoice;
            // אפשר להוסיף הודעה שההתקנה הצליחה או בוטלה כאן
            deferredPrompt = null;
        };
    }
});

// אופציונלי: להסתיר את הכפתור אם כבר מותקן
window.addEventListener('appinstalled', () => {
    const installBtn = document.getElementById('install-btn');
    if (installBtn) installBtn.style.display = 'none';
});

// --- Sociometric Stretcher Logic (New Counting System) ---

/**
 * Renders the sociometric selection page with a grid of runner cards.
 * Each card allows a one-time selection for stretcher or jerrican per heat.
 * @param {number} heatIndex - The index of the heat to render.
 */
function renderSociometricStretcherHeatPage(heatIndex) {
    headerTitle.textContent = `${CONFIG.STRETCHER_PAGE_LABEL} - מקצה ${heatIndex + 1}`;

    const heat = state.sociometricStretcher.heats[heatIndex];
    if (!heat) { contentDiv.innerHTML = `<p>מקצה לא נמצא.</p>`; return; }

    heat.selections = heat.selections || {};

    const selections = heat.selections;
    const stretcherCount = Object.values(selections).filter(v => v === 'stretcher').length;
    const jerricanCount  = Object.values(selections).filter(v => v === 'jerrican').length;
    const stretcherLimitReached = stretcherCount >= CONFIG.MAX_STRETCHER_CARRIERS;
    const jerricanLimitReached  = jerricanCount  >= CONFIG.MAX_JERRICAN_CARRIERS;

    const activeRunners = state.runners
        .filter(r => r.shoulderNumber && !state.crawlingDrills.runnerStatuses[r.shoulderNumber])
        .sort((a, b) => a.shoulderNumber - b.shoulderNumber);

    const runnerCardsHtml = activeRunners.map(runner => {
        const shoulderNumber = runner.shoulderNumber;
        const selection = heat.selections[shoulderNumber];

        const isStretcherSelected = selection === 'stretcher';
        const isJerricanSelected  = selection === 'jerrican';

        // נטרול רק לפי מכסה נוכחית והאם כבר מסומן תפקיד אחר
        const stretcherDisabled = isJerricanSelected || (!isStretcherSelected && stretcherLimitReached);
        const jerricanDisabled  = isStretcherSelected || (!isJerricanSelected && jerricanLimitReached);

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

    // Delegated click for task buttons
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
        } else {
            state.currentPage = PAGES.REPORT;
        }
        saveState();
        render();
    });
}

/**
 * כפתור צף (FAB) ו"חלון" תגובה מהירה עם צבעים ברורים
 */
function renderQuickCommentFAB(show) {
    // CSS חד-פעמי
    if (!document.getElementById('qc-fab-style')) {
        const s = document.createElement('style');
        s.id = 'qc-fab-style';
        s.textContent = `
.qc-fab{position:fixed; inset-inline-end:16px; bottom:16px; width:56px; height:56px; border-radius:50%;
  background:#2563eb; color:#fff; display:flex; align-items:center; justify-content:center;
  box-shadow:0 10px 28px rgba(0,0,0,.3); z-index:1000; cursor:pointer; border:none; font-size:24px;}
.qc-fab:hover{background:#1d4ed8}
.qc-sheet-backdrop{position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:999; display:none;}
.qc-sheet{position:fixed; bottom:84px; inset-inline-end:16px; width:min(440px,94vw);
  background:#ffffff; color:#111827; border-radius:14px; padding:12px 12px 10px; 
  box-shadow:0 14px 36px rgba(0,0,0,.35); border:1px solid #d1d5db; z-index:1001; display:none;}
.dark .qc-sheet{background:#111827; color:#f3f4f6; border-color:#374151;}
.qc-sheet .row{display:flex; align-items:center; gap:8px; margin:8px 0}
.qc-sheet select, .qc-sheet input{flex:1 1 auto; height:44px; border-radius:10px; border:1px solid rgba(0,0,0,.15);
  padding:8px 12px; font-size:16px; box-sizing:border-box; background:#ffffff; color:#111827;}
.dark .qc-sheet select, .dark .qc-sheet input{background:#1f2937; color:#f3f4f6; border-color:#374151;}
.qc-sheet .mic{width:42px; height:42px; border-radius:10px; border:1px solid rgba(0,0,0,.15);
  background:#374151; color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer;}
.qc-sheet .mic.recording{background:#ef4444; border-color:#dc2626}
.qc-sheet .actions{display:flex; justify-content:flex-start; gap:8px; margin-top:6px}
.qc-sheet .send{background:#10b981; color:#fff; border:none; padding:10px 16px; border-radius:10px; cursor:pointer; font-weight:600}
.qc-sheet .send:disabled{opacity:.5; cursor:not-allowed}
.qc-sheet .close{margin-inline-start:auto; background:#e5e7eb; border:none; border-radius:10px; padding:8px 10px; cursor:pointer}
.dark .qc-sheet .close{background:#374151; color:#e5e7eb}
.qc-sheet select{ text-align:center; text-align-last:center; }
        `;
        document.head.appendChild(s);
    }

    // ניקוי כשלא מציגים
    if (!show) {
        document.getElementById('qc-fab')?.remove();
        document.getElementById('qc-sheet')?.remove();
        document.getElementById('qc-sheet-backdrop')?.remove();
        return;
    }

    // יצירה חד-פעמית
    if (!document.getElementById('qc-fab')) {
        const fab = document.createElement('button');
        fab.id = 'qc-fab';
        fab.className = 'qc-fab';
        fab.title = 'הוסף תגובה מהירה';
        fab.setAttribute('aria-label','הוסף תגובה מהירה');
        fab.textContent = '💬';
        document.body.appendChild(fab);

        const backdrop = document.createElement('div');
        backdrop.id = 'qc-sheet-backdrop';
        backdrop.className = 'qc-sheet-backdrop';
        document.body.appendChild(backdrop);

        const sheet = document.createElement('div');
        sheet.id = 'qc-sheet';
        sheet.className = 'qc-sheet';
        document.body.appendChild(sheet);

        const open = () => {
            backdrop.style.display = 'block';
            sheet.style.display = 'block';
            setTimeout(() => document.getElementById('fab-input')?.focus(), 0);
        };
        const close = () => {
            sheet.style.display = 'none';
            backdrop.style.display = 'none';
        };

        fab.addEventListener('click', open);
        backdrop.addEventListener('click', close);

        // ציור התוכן + מאזינים
        buildFabSheetContent();

        // כפתור סגירה
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('#fab-close');
            if (btn) close();
        });
    } else {
        // עדכון הרשימה בכל רינדור
        buildFabSheetContent();
    }

    function buildFabSheetContent() {
        const runnerOptions = state.runners
            .slice()
            .sort((a, b) => a.shoulderNumber - b.shoulderNumber)
            .map(r => `<option value="${r.shoulderNumber}">${r.shoulderNumber}</option>`).join('');

        const sheet = document.getElementById('qc-sheet');
        sheet.innerHTML = `
          <div class="row" style="justify-content:space-between">
            <strong>הוספת תגובה מהירה</strong>
            <button id="fab-close" class="close">סגור ✖</button>
          </div>
          <div class="row">
            <label style="white-space:nowrap;">מס' כתף:</label>
            <select id="fab-runner">${runnerOptions}</select>
          </div>
          <div class="row">
            <label style="white-space:nowrap;">הערה:</label>
            <input id="fab-input" type="text" placeholder="הוסף הערה...">
            <button id="fab-mic" class="mic" title="הכתבה קולית" aria-label="הכתבה קולית">🎤</button>
          </div>
          <div class="actions">
            <button id="fab-send" class="send" disabled>שמור</button>
          </div>
        `;

        const selectEl = document.getElementById('fab-runner');
        const inputEl  = document.getElementById('fab-input');
        const micBtn   = document.getElementById('fab-mic');
        const sendBtn  = document.getElementById('fab-send');

        const updateSendEnabled = () => { sendBtn.disabled = inputEl.value.trim().length === 0; };
        inputEl.addEventListener('input', updateSendEnabled);
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendBtn.disabled) doSend();
            }
        });
        sendBtn.onclick = doSend;

        function doSend() {
            const shoulder = selectEl.value;
            const text = inputEl.value.trim();
            if (!shoulder || !text) return;
            if (state.generalComments[shoulder]) {
                state.generalComments[shoulder] += ' | ' + text;
            } else {
                state.generalComments[shoulder] = text;
            }
            saveState();
            inputEl.value = '';
            updateSendEnabled();
            document.getElementById('qc-sheet-backdrop').style.display = 'none';
            document.getElementById('qc-sheet').style.display = 'none';
            if (navigator.vibrate) navigator.vibrate(10);
        }

        // הכתבה קולית (אם נתמך)
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        let recognition = null, isRecording = false;

        if (SR) {
            recognition = new SR();
            recognition.lang = 'he-IL';
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript || '';
                inputEl.value = transcript;
                updateSendEnabled();
            };
            recognition.onerror = () => { isRecording = false; micBtn.classList.remove('recording'); micBtn.textContent = '🎤'; };
            recognition.onend = () => { isRecording = false; micBtn.classList.remove('recording'); micBtn.textContent = '🎤'; };

            const startRec = (e) => {
                e.preventDefault();
                if (!isRecording) {
                    try { recognition.start(); isRecording = true; micBtn.classList.add('recording'); micBtn.textContent = '🛑'; } catch {}
                }
            };
            const stopRec = (e) => { e.preventDefault(); if (isRecording) recognition.stop(); };

            micBtn.addEventListener('mousedown', startRec);
            micBtn.addEventListener('mouseup', stopRec);
            micBtn.addEventListener('mouseleave', stopRec);
            micBtn.addEventListener('touchstart', startRec, { passive: false });
            micBtn.addEventListener('touchend', stopRec);
        } else {
            micBtn.title = "הקלטה קולית דורשת דפדפן תומך ו-HTTPS";
        }
    }
}
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
