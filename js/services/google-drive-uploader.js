(function() {
  if (window.GoogleDriveUploader) return;

  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwteUl8IgGUpDku14VslePd9MCROeU9ZRBFaIudSQ/dev'; // <-- החלף ב-URL שהעתקת מהסקריפט

  /**
   * Converts a Blob object to a Base64 string.
   * @param {Blob} blob The blob to convert.
   * @returns {Promise<string>} A promise that resolves with the Base64 string.
   */
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  }

  /**
   * Uploads an Excel file blob to a specific Google Drive folder via Google Apps Script.
   * @param {Blob} excelBlob The Excel file as a Blob.
   * @returns {Promise<{status: string, message: string}>} A promise that resolves with the upload status.
   */
  async function upload(excelBlob) {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL') {
      throw new Error('Google Apps Script URL is not configured.');
    }

    try {
      const base64String = await blobToBase64(excelBlob);
      const fileName = `GibushReport_${new Date().toLocaleDateString('en-CA').replace(/-/g, '')}.xlsx`;

      // We use 'no-cors' mode because Apps Script web apps don't easily support CORS preflight requests.
      // This means we can't read the response body, but we can detect network errors.
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' }, // Use text/plain to avoid preflight
        body: JSON.stringify({
          fileName: fileName,
          base64: base64String
        }),
        mode: 'no-cors'
      });

      // Since we can't read the response, we assume success if no network error was thrown.
      return { status: 'success', message: 'הקובץ נשלח בהצלחה ל-Google Drive.' };

    } catch (error) {
      console.error('Google Drive Upload Failed:', error);
      if (error instanceof TypeError) {
        return { status: 'error', message: 'שגיאת רשת. ודא חיבור לאינטרנט ושה-URL של הסקריפט נכון.' };
      }
      return { status: 'error', message: 'שגיאה בתהליך ההעלאה.' };
    }
  }

  window.GoogleDriveUploader = {
    upload: upload
  };

})();

// בקובץ שבו מוגדרת הפונקציה exportToExcel (למשל, js/utils/export.js)

async function exportToExcel() {
  // ...
  // כל הקוד הקיים שלך שבונה את ה-workbook וממלא אותו בנתונים
  // const workbook = new ExcelJS.Workbook();
  // ...

  // --- זה החלק הקריטי ---
  // במקום לגרום להורדה, נייצר את הקובץ בזיכרון ונחזיר אותו כאובייקט Blob
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  // ודא שהפונקציה מחזירה את ה-Blob
  return blob;
}

// ודא שהפונקציה זמינה גלובלית
window.exportToExcel = exportToExcel;
