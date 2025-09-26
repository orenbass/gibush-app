// קובץ קונפיגורציה גלובלי לאפליקציה
// שים לב: var מייצר משתנה גלובלי (window.*), כדי שהקוד הקיים ימשיך לעבוד.

var CONFIG = {
    NUM_HEATS: 25,                 // מספר מקצי ספרינט
    MAX_CRAWLING_SPRINTS: 6,       // מספר מקסימלי של מקצי ספרינט זחילות
    MAX_RUNNERS: 16,               // מספר מקסימלי של רצים מותר
    MAX_SACK_CARRIERS: 3,          // מספר מקסימלי של נושאי שק בתרגילי זחילה
    NUM_STRETCHER_HEATS: 10,        // מספר מקצי אלונקה סוציומטרית
    MAX_STRETCHER_CARRIERS: 4,     // מספר נושאי אלונקה מקסימלי למקצה
    MAX_JERRICAN_CARRIERS: 3,      // ברירת מחדל 3
    SACK_CARRY_MINUTES_PER_POINT: 4, // דקות סחיבת שק לכל נקודה נוספת
    STRETCHER_PAGE_LABEL: 'אלונקות',                     // תווית הלשונית/כותרת
    STRETCHER_CARRIER_NOUN_PLURAL: 'רצים שלקחו אלונקה', // טקסט הנחיה לבחירה
    APP_STATE_KEY: 'sprintAppState_v1.11',               // מפתח ל-localStorage
    DASHBOARD_ALLOWED_EMAILS: [
        // רשימת מיילים מורשים לראות את לשונית הדשבורד (השאר ריק כדי לבטל)
        'gibush.hatam@gmail.com',
        'orenbassm@gmail.com',
        'ronmalk@gmail.com'
    ],
    // === הגדרות שליחה אוטומטית של גיבוי ===
    AUTO_BACKUP_UPLOAD_ENABLED: true,               // האם להפעיל שליחה אוטומטית
    AUTO_BACKUP_UPLOAD_INTERVAL_MS: 30000,          // מרווח בין שליחות (ברירת מחדל 30 שניות)
    AUTO_BACKUP_UPLOAD_MAX_DURATION_MS: 5 * 60 * 60 * 1000  // זמן מקסימלי לשליחה אוטומטית (5 שעות)
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