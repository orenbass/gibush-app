/**
 * מנהל התחברות לעמוד הנחיתה
 * Landing Page Authentication Manager
 */

class LandingAuthManager {
    constructor() {
        this.config = window.LANDING_CONFIG;
        this.isInitialized = false;
        this.currentUser = null;
        this.loginAttempts = 0;
        
        this.init();
    }

    /**
     * אתחול המערכת
     */
    async init() {
        try {
            console.log('🚀 מאתחל מערכת התחברות...');
            
            // בדיקה אם המשתמש כבר מחובר
            this.checkExistingSession();
            
            // אתחול Google Sign-In
            await this.initGoogleSignIn();
            
            // אתחול event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ מערכת התחברות הותחלה בהצלחה');
            
        } catch (error) {
            console.error('❌ שגיאה באתחול מערכת ההתחברות:', error);
            this.showError('שגיאה באתחול המערכת. אנא רענן את העמוד.');
        }
    }

    /**
     * בדיקת סשן קיים
     */
    checkExistingSession() {
        try {
            const savedSession = localStorage.getItem('gibushAuthState');
            if (savedSession) {
                const session = JSON.parse(savedSession);
                
                // בדיקה אם הסשן תקף
                if (this.isSessionValid(session)) {
                    console.log('📋 נמצא סשן תקף, מעביר לאפליקציה...');
                    this.redirectToApp();
                    return true;
                }
                
                // סשן לא תקף - נמחק
                localStorage.removeItem('gibushAuthState');
            }
        } catch (error) {
            console.warn('⚠️ שגיאה בבדיקת סשן קיים:', error);
            localStorage.removeItem('gibushAuthState');
        }
        
        return false;
    }

    /**
     * בדיקה אם סשן תקף
     */
    isSessionValid(session) {
        if (!session || !session.authState) return false;
        
        const now = Date.now();
        const sessionTime = session.timestamp || 0;
        const timeout = this.config.security.sessionTimeout;
        
        return (now - sessionTime) < timeout;
    }

    /**
     * אתחול Google Sign-In
     */
    async initGoogleSignIn() {
        return new Promise((resolve, reject) => {
            // המתנה לטעינת Google API
            const checkGoogleAPI = () => {
                if (typeof google !== 'undefined' && google.accounts) {
                    try {
                        // אתחול Google Identity Services
                        google.accounts.id.initialize({
                            client_id: this.config.googleClientId,
                            callback: this.handleGoogleCallback.bind(this),
                            auto_select: false,
                            cancel_on_tap_outside: true,
                            ux_mode: 'popup'
                        });

                        // רינדור כפתור ההתחברות
                        google.accounts.id.renderButton(
                            document.getElementById('googleSignInDiv'),
                            {
                                type: 'standard',
                                shape: 'rectangular',
                                theme: 'outline',
                                text: 'signin_with',
                                size: 'large',
                                logo_alignment: 'left',
                                width: '100%',
                                locale: 'he'
                            }
                        );

                        console.log('✅ Google Sign-In הותחל בהצלחה');
                        resolve();
                        
                    } catch (error) {
                        console.error('❌ שגיאה באתחול Google Sign-In:', error);
                        this.showDevelopmentGoogleButton();
                        resolve(); // ממשיכים גם במקרה של שגיאה
                    }
                } else {
                    // נסה שוב אחרי זמן קצר
                    setTimeout(checkGoogleAPI, 100);
                }
            };
            
            checkGoogleAPI();
            
            // timeout אחרי 10 שניות
            setTimeout(() => {
                if (!this.isInitialized) {
                    console.warn('⚠️ Google API לא נטען, מציג כפתור פיתוח');
                    this.showDevelopmentGoogleButton();
                    resolve();
                }
            }, 10000);
        });
    }

    /**
     * הצגת כפתור פיתוח לGoogle
     */
    showDevelopmentGoogleButton() {
        const container = document.getElementById('googleSignInDiv');
        if (container) {
            container.innerHTML = `
                <button id="devGoogleBtn" class="google-btn btn-ripple w-full flex items-center justify-center gap-3">
                    <svg class="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>התחבר עם Google (מצב פיתוח)</span>
                </button>
            `;
            
            document.getElementById('devGoogleBtn').addEventListener('click', () => {
                this.simulateGoogleLogin();
            });
        }
    }

    /**
     * הדמיה להתחברות Google (למצב פיתוח)
     */
    simulateGoogleLogin() {
        console.log('🔧 מדמה התחברות Google...');
        
        const mockUser = {
            name: 'משתמש לדוגמה',
            email: 'test@example.com',
            picture: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM0Mjg1RjQiLz4KPHN2ZyB4PSIxMCIgeT0iMTAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAxMkM4IDEyIDggOCAxMlMxNiA4IDE2IDEyUzEzIDE2IDEyIDE2UzggMTYgOCAxMloiLz4KPC9zdmc+Cjwvc3ZnPg==',
            verified_email: true
        };
        
        this.processGoogleUser(mockUser);
    }

    /**
     * טיפול בתגובה מGoogle
     */
    handleGoogleCallback(response) {
        try {
            console.log('📨 התקבלה תגובה מGoogle');
            this.showLoading(true);
            
            // פענוח JWT Token
            const token = response.credential;
            const payload = JSON.parse(atob(token.split('.')[1]));
            
            console.log('👤 פרטי משתמש מGoogle:', {
                name: payload.name,
                email: payload.email,
                verified: payload.email_verified
            });
            
            this.processGoogleUser(payload);
            
        } catch (error) {
            console.error('❌ שגיאה בעיבוד תגובת Google:', error);
            this.showError('שגיאה בעיבוד פרטי ההתחברות מGoogle');
            this.showLoading(false);
        }
    }

    /**
     * עיבוד פרטי משתמש מGoogle
     */
    processGoogleUser(userInfo) {
        try {
            // בדיקת הרשאה
            if (!this.isEmailAuthorized(userInfo.email)) {
                console.warn('🚫 כתובת מייל לא מורשה:', userInfo.email);
                this.showError(`כתובת המייל ${userInfo.email} אינה מורשית להתחבר למערכת`);
                this.showLoading(false);
                return;
            }
            
            // בדיקת אימות מייל
            if (this.config.security.requireEmailVerification && !userInfo.email_verified) {
                console.warn('📧 כתובת מייל לא מאומתת');
                this.showError('כתובת המייל צריכה להיות מאומתת');
                this.showLoading(false);
                return;
            }
            
            // שמירת פרטי משתמש
            const authState = {
                authState: {
                    isAuthenticated: true,
                    authMethod: 'google',
                    googleUserInfo: {
                        name: userInfo.name,
                        email: userInfo.email,
                        picture: userInfo.picture,
                        verified: userInfo.email_verified || userInfo.verified_email
                    },
                    isInitialSetupComplete: false
                },
                timestamp: Date.now(),
                sessionId: this.generateSessionId()
            };
            
            // שמירה ב-localStorage
            localStorage.setItem('gibushAuthState', JSON.stringify(authState));
            
            console.log('✅ התחברות Google הושלמה בהצלחה');
            
            // הצגת הודעת הצלחה ומעבר
            this.showSuccessAndRedirect(`ברוך הבא, ${userInfo.name}!`);
            
        } catch (error) {
            console.error('❌ שגיאה בעיבוד פרטי משתמש:', error);
            this.showError('שגיאה בשמירת פרטי ההתחברות');
            this.showLoading(false);
        }
    }

    /**
     * בדיקה אם כתובת מייל מורשית
     */
    isEmailAuthorized(email) {
        if (!email) return false;
        
        const normalizedEmail = email.toLowerCase().trim();
        return this.config.authorizedEmails.some(
            authorizedEmail => authorizedEmail.toLowerCase() === normalizedEmail
        );
    }

    /**
     * טיפול בכניסת אורח
     */
    handleGuestLogin() {
        try {
            console.log('👤 מבצע כניסת אורח...');
            this.showLoading(true);
            
            const authState = {
                authState: {
                    isAuthenticated: true,
                    authMethod: 'guest',
                    googleUserInfo: null,
                    isInitialSetupComplete: false
                },
                timestamp: Date.now(),
                sessionId: this.generateSessionId()
            };
            
            // שמירה ב-localStorage
            localStorage.setItem('gibushAuthState', JSON.stringify(authState));
            
            console.log('✅ כניסת אורח הושלמה בהצלחה');
            
            // הצגת הודעת הצלחה ומעבר
            this.showSuccessAndRedirect('נכנסת כאורח');
            
        } catch (error) {
            console.error('❌ שגיאה בכניסת אורח:', error);
            this.showError('שגיאה בכניסת אורח');
            this.showLoading(false);
        }
    }

    /**
     * יצירת מזהה סשן ייחודי
     */
    generateSessionId() {
        return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    /**
     * הצגת הודעת הצלחה ומעבר לאפליקציה
     */
    showSuccessAndRedirect(message) {
        // עדכון מסך הטעינה
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingText = loadingOverlay.querySelector('p');
        
        if (loadingText) {
            loadingText.textContent = message;
            loadingText.style.color = '#10b981'; // ירוק
        }
        
        this.showLoading(false);
        
        // הצגת חלון הגדרת פרטי קבוצה
        this.showGroupSetupModal();
    }

    /**
     * הצגת חלון הגדרת פרטי קבוצה
     */
    showGroupSetupModal() {
        const modal = document.getElementById('groupSetupModal');
        const evaluatorNameInput = document.getElementById('evaluatorName');
        const groupNumberInput = document.getElementById('groupNumber');
        const saveBtn = document.getElementById('saveGroupDetailsBtn');
        const errorDiv = document.getElementById('groupSetupError');

        // קבלת מצב האימות הנוכחי
        const savedSession = localStorage.getItem('gibushAuthState');
        if (!savedSession) return;
        
        const session = JSON.parse(savedSession);
        const authState = session.authState;

        // אם יש מידע ממשתמש Google, מלא את שם המעריך
        if (authState.googleUserInfo && authState.googleUserInfo.name) {
            evaluatorNameInput.value = authState.googleUserInfo.name;
        }

        // הצג את המודל
        modal.classList.remove('hidden');
        
        // Focus על השדה הראשון הריק
        if (evaluatorNameInput.value) {
            groupNumberInput.focus();
        } else {
            evaluatorNameInput.focus();
        }

        // מאזין לכפתור שמירה
        const self = this;
        saveBtn.onclick = function() {
            const evaluatorNameValue = evaluatorNameInput.value.trim();
            const groupNumberValue = groupNumberInput.value.trim();

            console.log('📝 מנסה לשמור פרטים:', { evaluatorNameValue, groupNumberValue });

            // בדיקת תקינות
            if (!evaluatorNameValue || !groupNumberValue) {
                self.showGroupSetupError('יש למלא את כל השדות');
                return;
            }

            // עדכון מצב האימות
            authState.evaluatorName = evaluatorNameValue;
            authState.groupNumber = groupNumberValue;
            authState.isInitialSetupComplete = true;

            // שמירה מעודכנת במצב האימות
            const updatedSession = {
                ...session,
                authState: authState
            };
            localStorage.setItem('gibushAuthState', JSON.stringify(updatedSession));

            // שמירת הפרטים גם ב-localStorage הרגיל של האפליקציה - בכוח!
            try {
                // יצירת מצב חדש לחלוטין
                const directAppState = {
                    evaluatorName: evaluatorNameValue,
                    groupNumber: groupNumberValue,
                    currentPage: 'runners',
                    runners: [],
                    heats: [],
                    crawlingDrills: {},
                    authState: authState
                };
                
                const fullState = {
                    config: {},
                    appState: directAppState
                };
                
                localStorage.setItem('gibushAppState', JSON.stringify(fullState));
                
                console.log('✅ פרטי קבוצה נשמרו בכוח:', { 
                    evaluatorName: evaluatorNameValue, 
                    groupNumber: groupNumberValue,
                    saved: 'gibushAppState'
                });
                
                // גם שמירה נוספת במפתח אחר למקרה
                localStorage.setItem('evaluatorDetails', JSON.stringify({
                    evaluatorName: evaluatorNameValue,
                    groupNumber: groupNumberValue,
                    timestamp: Date.now()
                }));
                
            } catch (error) {
                console.error('❌ שגיאה בשמירת פרטי קבוצה:', error);
            }

            // מעבר לאפליקציה הראשית
            self.redirectToApp();
        };

        // מאזינים ל-Enter
        evaluatorNameInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                groupNumberInput.focus();
            }
        });

        groupNumberInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveBtn.click();
            }
        });
    }

    /**
     * הצגת שגיאה בחלון הגדרת קבוצה
     */
    showGroupSetupError(message) {
        const errorDiv = document.getElementById('groupSetupError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
            
            // הסתרה אוטומטית אחרי 5 שניות
            setTimeout(() => {
                errorDiv.classList.add('hidden');
            }, 5000);
        }
    }

    /**
     * מעבר לאפליקציה הראשית
     */
    redirectToApp() {
        console.log('🚀 מעביר לאפליקציה הראשית...');
        
        // בדיקה אם יש קובץ index.html עם האפליקציה
        if (window.location.pathname.includes('landing.html')) {
            window.location.href = './index.html';
        } else {
            // אם כבר ב-index.html, פשוט רענן
            window.location.reload();
        }
    }

    /**
     * הצגת/הסתרת מסך טעינה
     */
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            if (show) {
                overlay.classList.add('show');
            } else {
                overlay.classList.remove('show');
            }
        }
    }

    /**
     * הצגת הודעת שגיאה
     */
    showError(message) {
        console.error('❌', message);
        
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.innerHTML = `<div class="error-message">${message}</div>`;
            errorDiv.classList.remove('hidden');
            
            // הסתרה אוטומטית אחרי 5 שניות
            setTimeout(() => {
                errorDiv.classList.add('hidden');
            }, 5000);
        }
        
        // עלייה במונה ניסיונות
        this.loginAttempts++;
        
        // בלוק זמני אחרי מספר ניסיונות כושלים
        if (this.loginAttempts >= this.config.security.maxLoginAttempts) {
            this.blockLoginTemporarily();
        }
    }

    /**
     * בלוק זמני של התחברות
     */
    blockLoginTemporarily() {
        console.warn('🔒 חסימה זמנית עקב ניסיונות התחברות כושלים');
        
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = true);
        
        this.showError('חסימה זמנית עקב ניסיונות התחברות כושלים. נסה שוב בעוד דקה.');
        
        // שחרור אחרי דקה
        setTimeout(() => {
            buttons.forEach(btn => btn.disabled = false);
            this.loginAttempts = 0;
            console.log('🔓 חסימה זמנית הוסרה');
        }, 60000);
    }

    /**
     * הגדרת event listeners
     */
    setupEventListeners() {
        // כפתור כניסת אורח
        const guestBtn = document.getElementById('guestLoginBtn');
        if (guestBtn) {
            guestBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleGuestLogin();
            });
        }
        
        // מניעת טופס submission
        document.addEventListener('submit', (e) => {
            e.preventDefault();
        });
        
        // בדיקת מקלדת (Enter על כפתורים)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const activeElement = document.activeElement;
                if (activeElement && activeElement.tagName === 'BUTTON') {
                    activeElement.click();
                }
            }
        });
    }
}

// התחברות מוצלחת
function handleSuccessfulAuth(authMethod, userInfo = null) {
    console.log('Authentication successful:', authMethod);
    
    // הסתרת מסך טעינה
    hideLoading();
    
    // עדכון מצב האימות
    const authState = {
        isAuthenticated: true,
        authMethod: authMethod,
        googleUserInfo: userInfo,
        isInitialSetupComplete: false
    };
    
    // שמירה למקומי
    localStorage.setItem('authState', JSON.stringify(authState));
    
    // הצגת חלון הגדרת פרטי קבוצה
    showGroupSetupModal(authState);
}

// הצגת חלון הגדרת פרטי קבוצה
function showGroupSetupModal(authState) {
    const modal = document.getElementById('groupSetupModal');
    const evaluatorName = document.getElementById('evaluatorName');
    const groupNumber = document.getElementById('groupNumber');
    const saveBtn = document.getElementById('saveGroupDetailsBtn');
    const errorDiv = document.getElementById('groupSetupError');

    // אם יש מידע ממשתמש Google, מלא את שם המעריך
    if (authState.googleUserInfo && authState.googleUserInfo.name) {
        evaluatorName.value = authState.googleUserInfo.name;
    }

    // הצג את המודל
    modal.classList.remove('hidden');
    
    // Focus על השדה הראשון הריק
    if (evaluatorName.value) {
        groupNumber.focus();
    } else {
        evaluatorName.focus();
    }

    // מאזין לכפתור שמירה
    saveBtn.onclick = function() {
        const evaluatorName = evaluatorName.value.trim();
        const groupNumber = groupNumber.value.trim();

        // בדיקת תקינות
        if (!evaluatorName || !groupNumber) {
            showGroupSetupError('יש למלא את כל השדות');
            return;
        }

        // שמירת הפרטים
        authState.evaluatorName = evaluatorName;
        authState.groupNumber = groupNumber;
        authState.isInitialSetupComplete = true;

        // שמירה למקומי
        localStorage.setItem('authState', JSON.stringify(authState));

        // מעבר לאפליקציה הראשית
        redirectToMainApp();
    };

    // מאזינים ל-Enter
    evaluatorName.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            groupNumber.focus();
        }
    });

    groupNumber.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveBtn.click();
        }
    });
}

// הצגת שגיאה בחלון הגדרת קבוצה
function showGroupSetupError(message) {
    const errorDiv = document.getElementById('groupSetupError');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    
    // הסתרה אוטומטית אחרי 5 שניות
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 5000);
}

// מעבר לאפליקציה הראשית
function redirectToMainApp() {
    console.log('🚀 מעביר לאפליקציה הראשית...');
    
    // בדיקה אם יש קובץ index.html עם האפליקציה
    if (window.location.pathname.includes('landing.html')) {
        window.location.href = './index.html';
    } else {
        // אם כבר ב-index.html, פשוט רענן
        window.location.reload();
    }
}

/**
 * אתחול מנהל ההתחברות
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 מתחיל אתחול מערכת התחברות...');
    
    // יצירת instance של מנהל ההתחברות
    window.authManager = new LandingAuthManager();
    
    console.log('✅ מערכת התחברות מוכנה');
});