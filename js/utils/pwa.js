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

  window.PWA = window.PWA || { setup };
})();