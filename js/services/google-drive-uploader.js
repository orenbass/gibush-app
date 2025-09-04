(function() {
  if (window.GoogleDriveUploader) return;

  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzd65c7vzrm0-XqtxWl-l7Yuh4RT4htdiETp_gn0KhVthr886rZtGqx3OyYPqu-8UU/exec';

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const base64 = reader.result.split(',')[1];
            resolve(base64);
        } catch(e){ reject(e); }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function upload(excelBlob) {
    try {
      if (!APPS_SCRIPT_URL) throw new Error('Missing APPS_SCRIPT_URL');

      // אם קיבלת Promise (כי שכחת await) – נמתין לו
      if (excelBlob && typeof excelBlob.then === 'function') {
        console.warn('upload(): got a Promise instead of Blob – awaiting it.');
        excelBlob = await excelBlob;
      }

      if (!(excelBlob instanceof Blob)) {
        console.error('upload(): expected Blob, got:', excelBlob);
        throw new Error('exportToExcel לא החזירה Blob תקין');
      }

      console.log('Uploader: blob size =', excelBlob.size, 'type =', excelBlob.type);
      const base64String = await blobToBase64(excelBlob);
      console.log('Uploader: base64 length =', base64String.length);

      const fileName = `GibushReport_${new Date().toLocaleDateString('en-CA').replace(/-/g,'')}.xlsx`;

      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ fileName, base64: base64String }),
        mode: 'no-cors'
      });

      return { status: 'success', message: 'הקובץ נשלח בהצלחה ל-Google Drive.' };
    } catch (error) {
      console.error('Google Drive Upload Failed:', error);
      return { status: 'error', message: error.message || 'שגיאה בתהליך ההעלאה.' };
    }
  }

  window.GoogleDriveUploader = { upload };
})();
