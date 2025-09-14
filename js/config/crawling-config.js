(function () {
    // Ensure both the global and a local reference exist (works even with type="module")
    const CONFIG = (window.CONFIG = window.CONFIG || {});
    CONFIG.CRAWLING_GROUP_COMMON_COMMENTS = CONFIG.CRAWLING_GROUP_COMMON_COMMENTS || {
        good: [
            'פעיל מאוד בקבוצה',
            'עוזר לאחרים',
            'מנהיג את הקבוצה',
            'לא מוותר גם כשקשה'
        ],
        neutral: [
            'לא מורגש בקבוצה',
            'לא יוזם',
            'מתאמץ חלקית בלבד',
            'לא עקבי - קצב משתנה',
            'בינוני - לרוב באמצע'
        ],
        bad: [
            'מעכב את הקבוצה',
            'לא עומד בלחץ',
            'לא מבין הוראות',
            'מתייאש מול קושי',
            'נסחב על ידי אחרים',
            'חלש - לרוב אחרון'
        ]
    };
})();
