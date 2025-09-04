
window.exportToExcel = function exportToExcel() {
  return new Promise((resolve, reject) => {
    console.log('exportToExcel: התחלת יצירת הקובץ.');
    try {
      // 1. בדיקה האם ספריית ExcelJS נטענה
      if (typeof ExcelJS === 'undefined') {
        console.error('exportToExcel: ספריית ExcelJS לא נטענה!');
        alert('שגיאה קריטית: ספריית ExcelJS לא נטענה.');
        reject(new Error('ExcelJS library not loaded.'));
        return;
      }
      console.log('exportToExcel: ספריית ExcelJS נמצאה.');

      // 2. יצירת קובץ וגיליון
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Report');
      console.log('exportToExcel: נוצר קובץ וגיליון עבודה.');

      // 3. הוספת נתונים
      ws.addRow(['דוח גיבוש', new Date().toLocaleString('he-IL')]);
      ws.addRow([]);
      ws.addRow(['מספר כתף', 'ניקוד סופי']);
      
      const runners = window.state?.runners || [];
      if (runners.length === 0) {
        console.warn('exportToExcel: לא נמצאו נתוני מתמודדים. הדוח יהיה ריק.');
      }
      
      runners.forEach(r => {
        ws.addRow([r.shoulderNumber, r.totalScore || 0]);
      });
      console.log('exportToExcel: הנתונים הוספו לגיליון.');

      // 4. יצירת הקובץ הבינארי (באופן אסינכרוני)
      console.log('exportToExcel: מתחיל יצירת Buffer...');
      wb.xlsx.writeBuffer().then(buffer => {
        console.log(`exportToExcel: נוצר Buffer בגודל ${buffer.byteLength} בתים.`);

        // 5. יצירת אובייקט Blob
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        console.log(`exportToExcel: נוצר Blob בגודל ${blob.size}. התהליך הסתיים בהצלחה!`);
        
        resolve(blob); // החזרת ה-Blob והשלמת ה-Promise
      }).catch(err => {
        console.error('exportToExcel: שגיאה ביצירת ה-Buffer:', err);
        reject(err);
      });

    } catch (error) {
      console.error('exportToExcel: אירעה שגיאה קריטית בתהליך יצירת הקובץ:', error);
      alert('שגיאה ביצירת קובץ האקסל: ' + error.message);
      reject(error);
    }
  });
};
