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
    APP_STATE_KEY: 'sprintAppState_v1.11'                // מפתח ל-localStorage
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
    ADMIN_SETTINGS: 'admin-settings'
};