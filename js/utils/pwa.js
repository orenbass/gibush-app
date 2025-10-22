(function () {
  'use strict';
  let deferredInstallPrompt = null;

  function setup() {
    const installBtn = document.getElementById('install-btn');
    if (!installBtn) return;

    const isApple = /iP(hone|ad|od)|Mac/i.test(navigator.userAgent);
    installBtn.style.display = isApple ? 'none' : 'none';

    installBtn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) {
        window.showModal?.('התקנה', 'לא ניתן להתקין כעת. ודא שהעמוד נטען ב-HTTPS ונסה מאוחר יותר.');
        return;
      }
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice.catch(() => {});
      deferredInstallPrompt = null;
      installBtn.style.display = 'none';
    });
  }

  // פונקציה לניקוי Cache ו-Service Worker
  async function clearAllCachesAndReload() {
    try {
      console.log('[PWA] Starting cache clear...');
      
      // 1. שליחת הודעה ל-Service Worker למחוק את כל ה-Caches
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_ALL_CACHES'
        });
      }
      
      // 2. מחיקה ישירה של כל ה-Caches
      if (window.caches) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('[PWA] Deleted caches:', cacheNames);
      }
      
      // 3. ביטול רישום של כל ה-Service Workers
      if (navigator.serviceWorker) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
        console.log('[PWA] Unregistered', registrations.length, 'service workers');
      }
      
      // 4. ניקוי sessionStorage
      sessionStorage.clear();
      
      console.log('[PWA] Cache cleared successfully!');
      return true;
    } catch (error) {
      console.error('[PWA] Error clearing cache:', error);
      return false;
    }
  }

  // פונקציה לקבלת גרסה מה-Service Worker
  async function getServiceWorkerVersion() {
    return new Promise((resolve) => {
      if (!navigator.serviceWorker?.controller) {
        resolve('לא זמין');
        return;
      }
      
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        if (event.data?.type === 'CURRENT_VERSION') {
          resolve(event.data.version);
        } else {
          resolve('לא ידוע');
        }
      };
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_VERSION' },
        [messageChannel.port2]
      );
      
      // Timeout אחרי 2 שניות
      setTimeout(() => resolve('לא ידוע'), 2000);
    });
  }

  // פונקציה לרענון האפליקציה עם ניקוי Cache
  async function forceRefreshApp() {
    const success = await clearAllCachesAndReload();
    if (success) {
      // המתנה קצרה לוודא שהכל נמחק
      setTimeout(() => {
        window.location.reload(true); // Hard reload
      }, 500);
    } else {
      alert('שגיאה בניקוי Cache. נסה לרענן ידנית (Ctrl+Shift+R)');
    }
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

  // האזנה לעדכון גרסה מה-Service Worker
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'VERSION_UPDATE') {
        console.log('[PWA] New version detected:', event.data.version);
        // ניתן להוסיף כאן התראה למשתמש על גרסה חדשה
      }
      
      if (event.data?.type === 'CACHES_CLEARED') {
        console.log('[PWA] Service Worker confirmed cache clear');
      }
    });
  }

  window.PWA = window.PWA || { 
    setup,
    clearAllCachesAndReload,
    forceRefreshApp,
    getServiceWorkerVersion
  };

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .then(r => {
          console.log('[PWA] Service worker registered', r.scope);
          
          // בדיקה לעדכון Service Worker
          r.addEventListener('updatefound', () => {
            const newWorker = r.installing;
            console.log('[PWA] New service worker found, installing...');
            
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New version available! Consider showing update prompt.');
                // כאן ניתן להציג הודעה למשתמש שיש גרסה חדשה
              }
            });
          });
        })
        .catch(err => console.warn('[PWA] SW register failed', err));
    });
  }
})();