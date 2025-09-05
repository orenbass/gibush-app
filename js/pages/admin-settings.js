(function () {
  window.Pages = window.Pages || {};
  window.Pages.renderAdminSettingsPage = function () {
    const c = document.getElementById('content');
    if (!c) return;
    c.innerHTML = `
      <div class="p-8 text-center">
        <h2 class="text-2xl font-bold mb-4">הגדרות מנהל</h2>
        <p class="opacity-70">עמוד זה בפיתוח.</p>
      </div>`;
  };
})();