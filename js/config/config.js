// קובץ קונפיגורציה גלובלי לאפליקציה
// שים לב: var מייצר משתנה גלובלי (window.*), כדי שהקוד הקיים ימשיך לעבוד.

// פונקציה לטעינת הגדרות מהדרייב אם קיימות
function loadSettingsFromDrive() {
    try {
        const downloadedSettings = localStorage.getItem('downloadedSystemSettings');
        if (downloadedSettings) {
            const settings = JSON.parse(downloadedSettings);
            console.log('🌐 נמצאו הגדרות מהדרייב בזמן טעינת CONFIG:', settings);
            return settings;
        }
    } catch (e) {
        console.warn('⚠️ שגיאה בקריאת הגדרות מהדרייב:', e);
    }
    return null;
}

// טעינת הגדרות מהדרייב
const driveSettings = loadSettingsFromDrive();

// ברירות מחדל
const DEFAULT_CONFIG = {
    NUM_HEATS: 25,
    MAX_CRAWLING_SPRINTS: 6,
    MAX_RUNNERS: 16,
    MAX_SACK_CARRIERS: 3,
    NUM_STRETCHER_HEATS: 10,
    MAX_STRETCHER_CARRIERS: 4,
    MAX_JERRICAN_CARRIERS: 3,
    SACK_CARRY_MINUTES_PER_POINT: 4,
    STRETCHER_PAGE_LABEL: 'אלונקות',
    STRETCHER_CARRIER_NOUN_PLURAL: 'רצים שלקחו אלונקה',
    APP_STATE_KEY: 'sprintAppState_v1.11',
    AUTO_BACKUP_UPLOAD_ENABLED: true,
    AUTO_BACKUP_UPLOAD_INTERVAL_MS: 30000,
    AUTO_BACKUP_UPLOAD_MAX_DURATION_MS: 5 * 60 * 60 * 1000
};

// יצירת CONFIG - עדיפות להגדרות מהדרייב
var CONFIG = {};

if (driveSettings && driveSettings.exerciseSettings) {
    console.log('✅ משתמש בהגדרות תרגילים מהדרייב');
    Object.assign(CONFIG, DEFAULT_CONFIG, driveSettings.exerciseSettings);
} else {
    console.log('📋 משתמש בהגדרות ברירת מחדל');
    Object.assign(CONFIG, DEFAULT_CONFIG);
}

// עדכון הגדרות גיבוי מהדרייב אם קיימות
if (driveSettings && driveSettings.backupSettings) {
    console.log('✅ משתמש בהגדרות גיבוי מהדרייב');
    if (driveSettings.backupSettings.enabled !== undefined) {
        CONFIG.AUTO_BACKUP_UPLOAD_ENABLED = driveSettings.backupSettings.enabled;
    }
    if (driveSettings.backupSettings.intervalMinutes !== undefined) {
        CONFIG.AUTO_BACKUP_UPLOAD_INTERVAL_MS = driveSettings.backupSettings.intervalMinutes * 60 * 1000;
    }
    if (driveSettings.backupSettings.stopAfterMinutes !== undefined) {
        CONFIG.AUTO_BACKUP_UPLOAD_MAX_DURATION_MS = driveSettings.backupSettings.stopAfterMinutes * 60 * 1000;
    }
}

// עדכון הערות מהירות מהדרייב אם קיימות (quickComments)
if (driveSettings && driveSettings.quickComments) {
    const qc = driveSettings.quickComments;
    // וידוא מבנה
    const sanitizeArr = (arr) => Array.isArray(arr) ? arr.map(s => String(s||'').trim()).filter(Boolean) : [];
    CONFIG.CRAWLING_GROUP_COMMON_COMMENTS = {
        good: sanitizeArr(qc.good),
        neutral: sanitizeArr(qc.neutral),
        bad: sanitizeArr(qc.bad)
    };
    console.log('📝 נטענו הערות מהירות מהדרייב (quickComments):', CONFIG.CRAWLING_GROUP_COMMON_COMMENTS);
}

console.log('📊 CONFIG סופי:', CONFIG);

// === הגדרות התחברות ואבטחה ===
var LANDING_CONFIG = {
    // Google OAuth Client ID
    googleClientId: '311170561985-dh629r3dc4cvkcsunicpnqr6ptk9jrol.apps.googleusercontent.com',
    
    // כתובות מייל מורשות להתחברות - מתבסס על USERS_CONFIG
    get authorizedEmails() {
        return window.USERS_CONFIG ? window.USERS_CONFIG.getAuthorizedEmails() : [];
    },
    
    // הגדרות עיצוב
    branding: {
        appName: 'מערכת גיבוש חת"מ',
        version: 'V2.0',
        copyright: '© 2025 - כל הזכויות שמורות',
        description: 'מערכת דיגיטלית מתקדמת לניהול ומעקב אחר תהליכי גיבוש'
    },
    
    // הגדרות אבטחה
    security: {
        requireEmailVerification: true,
        sessionTimeout: 24 * 60 * 60 * 1000, // 24 שעות במילי-שניות
        maxLoginAttempts: 3
    },
    
    // הגדרות UI
    ui: {
        enableAnimations: true,
        showLogo: true,
        showBackground: true,
        theme: 'military' // 'military', 'corporate', 'modern'
    }
};

// === הגדרות Google Drive ===
var GOOGLE_DRIVE_CONFIG = {
    // מזהה התיקייה בדרייב שבה מאוחסנים קבצי ההגדרות והגיבויים
    // כדי למצוא את ה-ID: פתח את התיקייה בדרייב והעתק את המזהה מה-URL
    // לדוגמה: https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz
    // ה-ID הוא: 1AbCdEfGhIjKlMnOpQrStUvWxYz
    FOLDER_ID: '154ovEyX_6-9yqNeD-wb4B9L_m5AxAvCI', // 🔧 הזן כאן את מזהה התיקייה
    
    // שם קובץ ההגדרות
    SETTINGS_FILE_NAME: 'settings-backup.json'
};

// סיסמת מנהל
var ADMIN_PASSWORD = 'malkin';

// Enum של הדפים
var PAGES = {
    RUNNERS: 'runners',
    STATUS_MANAGEMENT: 'status-management',
    HEATS: 'heats',
    CRAWLING_COMMENTS: 'crawling-drills-comments',
    CRAWLING_SPRINT: 'crawling-sprint',
    STRETCHER_HEAT: 'sociometric-stretcher-heat',
    REPORT: 'report',
    ADMIN_SETTINGS: 'admin-settings',
    AGGREGATED_DASHBOARD: 'aggregated-dashboard' // NEW unified dashboard
};

// Export לשימוש בקבצים אחרים
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
    window.LANDING_CONFIG = LANDING_CONFIG;
    window.GOOGLE_DRIVE_CONFIG = GOOGLE_DRIVE_CONFIG;
    window.ADMIN_PASSWORD = ADMIN_PASSWORD;
    window.PAGES = PAGES;
}