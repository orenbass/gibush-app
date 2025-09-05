window.GibushAppExporter = window.GibushAppExporter || {};

window.GibushAppExporter.createExcelBlob = function createExcelBlob() {
  return new Promise((resolve, reject) => {
    // הגדרת Timeout למניעת תקיעה של האפליקציה
    const timeoutId = setTimeout(() => {
      console.error('createExcelBlob: Timeout! התהליך לקח יותר מ-10 שניות ובוטל.');
      reject(new Error('Timeout: יצירת קובץ האקסל נתקעה. בדוק את הנתונים בקונסול.'));
    }, 10000); // 10 שניות

    console.log('createExcelBlob: התחלת יצירת הקובץ.');
    try {
      if (typeof ExcelJS === 'undefined') {
        clearTimeout(timeoutId);
        reject(new Error('ExcelJS library not loaded.'));
        return;
      }

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Report');

      ws.addRow(['דוח גיבוש', new Date().toLocaleString('he-IL')]);
      ws.addRow([]);
      ws.addRow(['מספר כתף', 'ניקוד סופי']);
      
      const runners = window.state?.runners || [];
      
      // הדפסת הנתונים הגולמיים לבדיקה - זה החלק החשוב!
      console.log('createExcelBlob: הנתונים שיוכנסו לקובץ:', JSON.parse(JSON.stringify(runners)));

      if (runners.length === 0) {
        console.warn('createExcelBlob: לא נמצאו נתוני מתמודדים.');
      }
      
      runners.forEach(r => {
        const shoulder = r.shoulderNumber;
        const score = r.totalScore || 0;
        ws.addRow([shoulder, score]);
      });
      console.log('createExcelBlob: הנתונים הוספו לגיליון.');

      console.log('createExcelBlob: מתחיל יצירת Buffer...');
      wb.xlsx.writeBuffer().then(buffer => {
        clearTimeout(timeoutId); // בטל את ה-Timeout כי התהליך הצליח
        console.log(`createExcelBlob: נוצר Buffer בגודל ${buffer.byteLength} בתים.`);
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        resolve(blob);
      }).catch(err => {
        clearTimeout(timeoutId);
        console.error('createExcelBlob: שגיאה ביצירת ה-Buffer:', err);
        reject(err);
      });

    } catch (error) {
      clearTimeout(timeoutId);
      console.error('createExcelBlob: אירעה שגיאה קריטית:', error);
      reject(error);
    }
  });
};