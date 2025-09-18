/**
 * קונפיגורציה לעמוד הנחיתה והתחברות
 */
const LANDING_CONFIG = {
    // Google OAuth Client ID
    googleClientId: '311170561985-dh629r3dc4cvkcsunicpnqr6ptk9jrol.apps.googleusercontent.com',
    
    // כתובות מייל מורשות (רק אלה יוכלו להתחבר)
    authorizedEmails: [
        'gibush.hatam@gmail.com'        // הוסף כאן כתובות מייל נוספות
    ],
    
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

// Export לשימוש בקבצים אחרים
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LANDING_CONFIG;
} else {
    window.LANDING_CONFIG = LANDING_CONFIG;
}