(function () {
  'use strict';

  function showModal(title, message, onConfirm, isInputModal = false, onInputConfirm) {
    const existingModal = document.getElementById('confirmation-modal');
    if (existingModal) existingModal.remove();

    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50';
    modalBackdrop.id = 'confirmation-modal';

    const inputHtml = isInputModal
      ? `<input type="password" id="modal-input" class="w-full p-2 mt-4 border border-gray-300 dark:border-gray-600 rounded-lg text-lg text-right bg-white dark:bg-gray-700 dark:text-white" placeholder="הכנס קוד גישה">`
      : '';

    modalBackdrop.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-sm mx-4 text-right">
        <h3 class="text-xl font-bold mb-4">${title}</h3>
        <p class="text-gray-700 dark:text-gray-300 mb-6">${message}</p>
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
      confirmBtn.onclick = () => { if (onConfirm) onConfirm(); document.body.removeChild(modalBackdrop); };
    }
    cancelBtn.onclick = () => document.body.removeChild(modalBackdrop);
  }

  function confirmLeaveCrawlingComments(onConfirm) {
    const st = window.state;
    const PAGES = window.PAGES || {};
    const onCrawling = st?.currentPage === PAGES.CRAWLING_COMMENTS;
    const hasActive = Array.isArray(st?.crawlingDrills?.activeSackCarriers) && st.crawlingDrills.activeSackCarriers.length > 0;

    if (onCrawling && hasActive) {
      showModal('אישור יציאה', 'יציאה תפסיק את כל נושאי השק ותנקה את הבחירות. להמשיך?', () => {
        window.stopAllSackTimers?.();
        if (st?.crawlingDrills) st.crawlingDrills.activeSackCarriers = [];
        window.saveState?.();
        if (typeof onConfirm === 'function') onConfirm();
      });
      return true;
    }
    return false;
  }

  window.showModal = window.showModal || showModal;
  window.confirmLeaveCrawlingComments = window.confirmLeaveCrawlingComments || confirmLeaveCrawlingComments;
})();