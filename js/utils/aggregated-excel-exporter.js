// ===============================================
// ייצוא אקסל מאוחד מהדשבורד האגרגטיבי
// ===============================================

window.AggregatedExcelExporter = {
  /**
   * יצירת קובץ אקסל מאוחד
   * @param {Object} dashboard - המופע של AggregatedDashboard
   * @returns {Promise<void>}
   */
  async exportToExcel(dashboard) {
    if (typeof ExcelJS === 'undefined') {
      alert('שגיאה: ספריית ExcelJS לא נטענה. אנא רענן את הדף ונסה שוב.');
      return;
    }

    // יצירת workbook עם RTL
    const wb = new ExcelJS.Workbook();
    wb.views = [{ rightToLeft: true }];
    
    const now = new Date();
    const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    const dateStr = dashboard.lastQuery ? `${monthNames[dashboard.lastQuery.month - 1]} ${dashboard.lastQuery.year}` : now.toLocaleDateString('he-IL');

    // יצירת גליון סיכום כללי
    await this._createSummarySheet(wb, dashboard, dateStr);
    
    // יצירת גליונות לפי קבוצות
    await this._createGroupSheets(wb, dashboard);
    
    // יצירת גליון הערות מאוחדות
    await this._createCommentsSheet(wb, dashboard);

    // הורדת הקובץ
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    const filename = `גיבוש_מאוחד_${dateStr.replace(/\s+/g, '_')}_${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}.xlsx`;
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('✅ קובץ אקסל מאוחד נוצר בהצלחה:', filename);
  },

  /**
   * יצירת גליון סיכום כללי
   */
  async _createSummarySheet(wb, dashboard, dateStr) {
    const summaryWs = wb.addWorksheet('סיכום כללי');
    summaryWs.views = [{ rightToLeft: true }];
    
    // כותרת
    summaryWs.getCell('A1').value = `סיכום מאוחד של כל המועמדים - ${dateStr}`;
    summaryWs.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF1e293b' } };
    summaryWs.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    summaryWs.mergeCells('A1:I1');
    
    // כותרות טבלה
    const summaryHeaders = ['מיקום', 'קבוצה', 'מס\' כתף', 'ספרינט', 'זחילה', 'אלונקה', 'ממוצע כולל', 'מספר מעריכים', 'הערות'];
    summaryHeaders.forEach((header, idx) => {
      const cell = summaryWs.getCell(3, idx + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    
    // נתונים
    const allCandidates = dashboard.aggregateAllCandidates();
    
    allCandidates.forEach((candidate, idx) => {
      const rowIdx = 4 + idx;
      
      // איסוף כל ההערות מכל המעריכים
      const allComments = this._collectAllComments(dashboard, candidate.group, candidate.shoulder);
      
      const rowData = [
        idx + 1,
        candidate.group,
        candidate.shoulder,
        candidate.sprintAvg ?? '-',
        candidate.crawlingAvg ?? '-',
        candidate.stretcherAvg ?? '-',
        candidate.overallAvg ?? '-',
        candidate.evalCount,
        allComments.join(' | ')
      ];
      
      rowData.forEach((value, colIdx) => {
        const cell = summaryWs.getCell(rowIdx, colIdx + 1);
        cell.value = value;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: colIdx === 8 };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        
        // צבעי רקע לפי מיקום
        if (idx === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD700' } };
        else if (idx === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC0C0C0' } };
        else if (idx === 2) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCD7F32' } };
        else if (idx % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      });
    });
    
    // התאמת רוחב עמודות
    [10, 10, 12, 12, 12, 12, 14, 14, 50].forEach((width, idx) => {
      summaryWs.getColumn(idx + 1).width = width;
    });
  },

  /**
   * יצירת גליונות לפי קבוצות
   */
  async _createGroupSheets(wb, dashboard) {
    const groupNumbers = dashboard._groupNumbers();
    
    for (const groupNumber of groupNumbers) {
      const gData = dashboard.state.groups.get(groupNumber);
      if (!gData) continue;
      
      const ws = wb.addWorksheet(`קבוצה ${groupNumber}`);
      ws.views = [{ rightToLeft: true }];
      
      let currentRow = 1;
      
      // טבלה מסכמת
      ws.getCell(`A${currentRow}`).value = `קבוצה ${groupNumber} - סיכום ממוצעי כל המעריכים`;
      ws.getCell(`A${currentRow}`).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      ws.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
      ws.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
      ws.mergeCells(`A${currentRow}:H${currentRow}`); // תוקן מ-I ל-H (8 עמודות)
      currentRow++;
      
      // כותרות טבלה מסכמת - כולל עמודת הערות מאוחדות
      const groupSummaryHeaders = ['מיקום', 'מס\' כתף', 'ספרינט', 'זחילה', 'אלונקה', 'ממוצע כולל', 'מספר מעריכים', 'הערות מאוחדות'];
      groupSummaryHeaders.forEach((header, idx) => {
        const cell = ws.getCell(currentRow, idx + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6C757D' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      currentRow++;
      
      // נתוני הסיכום
      const groupCandidates = dashboard.aggregateGroup(gData);
      groupCandidates.forEach((candidate, idx) => {
        // איסוף כל ההערות לכתף זה מכל המעריכים בקבוצה
        const allComments = this._collectAllComments(dashboard, groupNumber, candidate.shoulder);
        
        const rowData = [
          idx + 1,
          candidate.shoulder,
          candidate.sprintAvg ?? '-',
          candidate.crawlingAvg ?? '-',
          candidate.stretcherAvg ?? '-',
          candidate.overallAvg ?? '-',
          candidate.evalCount,
          allComments.join(' | ')
        ];
        
        rowData.forEach((value, colIdx) => {
          const cell = ws.getCell(currentRow, colIdx + 1);
          cell.value = value;
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: colIdx === 7 };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          
          // צבעי רקע
          if (idx === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD700' } };
          else if (idx === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC0C0C0' } };
          else if (idx === 2) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCD7F32' } };
          else if (idx % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
        });
        currentRow++;
      });
      
      currentRow += 2;
      
      // טבלאות לכל מעריך
      const evaluators = Array.from(gData.evaluators.entries());
      
      evaluators.forEach(([evaluatorName, evalData]) => {
        ws.getCell(`A${currentRow}`).value = `מעריך: ${evaluatorName}`;
        ws.getCell(`A${currentRow}`).font = { bold: true, size: 13, color: { argb: 'FF1e293b' } };
        ws.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFe0e7ff' } };
        ws.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.mergeCells(`A${currentRow}:F${currentRow}`);
        currentRow++;
        
        const evalHeaders = ['מס\' כתף', 'ספרינט', 'זחילה', 'אלונקה', 'ממוצע', 'הערות'];
        evalHeaders.forEach((header, idx) => {
          const cell = ws.getCell(currentRow, idx + 1);
          cell.value = header;
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF94a3b8' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
        currentRow++;
        
        const runners = evalData.runners || [];
        runners.forEach((runner, runnerIdx) => {
          const sprintAvg = runner.finalScores?.sprint ?? '-';
          const crawlingAvg = runner.finalScores?.crawling ?? '-';
          const stretcherAvg = runner.finalScores?.stretcher ?? '-';
          const scores = [sprintAvg, crawlingAvg, stretcherAvg].filter(v => typeof v === 'number');
          const overallAvg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : '-';
          
          const comments = dashboard._collectComments(evalData, runner.shoulderNumber);
          const commentsStr = comments.join(' | ');
          
          const rowData = [
            runner.shoulderNumber,
            sprintAvg,
            crawlingAvg,
            stretcherAvg,
            overallAvg,
            commentsStr
          ];
          
          rowData.forEach((value, colIdx) => {
            const cell = ws.getCell(currentRow, colIdx + 1);
            cell.value = value;
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: colIdx === 5 };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            
            if (runnerIdx % 2 === 0) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
            }
          });
          currentRow++;
        });
        
        currentRow += 2;
      });
      
      // התאמת רוחב עמודות
      [12, 12, 12, 12, 12, 14, 40, 50].forEach((width, idx) => {
        ws.getColumn(idx + 1).width = width;
      });
    }
  },

  /**
   * יצירת גליון הערות מאוחדות
   */
  async _createCommentsSheet(wb, dashboard) {
    const commentsWs = wb.addWorksheet('הערות מאוחדות');
    commentsWs.views = [{ rightToLeft: true }];
    
    commentsWs.getCell('A1').value = 'הערות מאוחדות לכל מועמד מכל המעריכים';
    commentsWs.getCell('A1').font = { bold: true, size: 14 };
    commentsWs.getCell('A1').alignment = { horizontal: 'center' };
    commentsWs.mergeCells('A1:E1');
    
    const commentsHeaders = ['קבוצה', 'מס\' כתף'];
    const allEvaluators = dashboard._allEvaluatorNames();
    allEvaluators.forEach(name => commentsHeaders.push(name));
    
    commentsHeaders.forEach((header, idx) => {
      const cell = commentsWs.getCell(3, idx + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    
    let commentRow = 4;
    dashboard.state.groups.forEach((gData, groupNumber) => {
      const shoulderNumbers = new Set();
      gData.evaluators.forEach(evalData => {
        (evalData.runners || []).forEach(r => shoulderNumbers.add(r.shoulderNumber));
      });
      
      const sortedShoulders = Array.from(shoulderNumbers).sort((a, b) => a - b);
      
      sortedShoulders.forEach((shoulder, idx) => {
        const rowData = [groupNumber, shoulder];
        
        allEvaluators.forEach(evaluatorName => {
          const evalData = gData.evaluators.get(evaluatorName);
          if (evalData) {
            const comments = dashboard._collectComments(evalData, shoulder);
            rowData.push(comments.length > 0 ? comments.join(' | ') : '');
          } else {
            rowData.push('');
          }
        });
        
        rowData.forEach((value, colIdx) => {
          const cell = commentsWs.getCell(commentRow, colIdx + 1);
          cell.value = value;
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: colIdx >= 2 };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          
          if (idx % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
          }
        });
        commentRow++;
      });
    });
    
    commentsWs.getColumn(1).width = 10;
    commentsWs.getColumn(2).width = 12;
    for (let i = 3; i <= commentsHeaders.length; i++) {
      commentsWs.getColumn(i).width = 35;
    }
  },

  /**
   * איסוף כל ההערות מכל המעריכים למועמד ספציפי
   */
  _collectAllComments(dashboard, group, shoulder) {
    const gData = dashboard.state.groups.get(group);
    const allComments = [];
    
    if (gData) {
      gData.evaluators.forEach((evalData) => {
        const comments = dashboard._collectComments(evalData, shoulder);
        comments.forEach(comment => {
          if (!allComments.includes(comment)) {
            allComments.push(comment);
          }
        });
      });
    }
    
    return allComments;
  }
};
