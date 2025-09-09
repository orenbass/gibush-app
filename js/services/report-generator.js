(function () {
  window.ReportGenerator = window.ReportGenerator || {};

  window.ReportGenerator.generateFinalReportBlob = async function () {
    if (!window.ExcelJS) throw new Error('ExcelJS not loaded');

    // ----- בסיס -----
    const wb = new ExcelJS.Workbook();
    wb.creator = 'GibushApp';
    wb.created = new Date();
    wb.modified = new Date();

    // ----- איסוף נתונים משותפים -----
    const runners = Array.isArray(state?.runners) ? state.runners : [];
    const runnerStatuses = state?.crawlingDrills?.runnerStatuses || {};
    const manualScores = state?.manualScores || {};
    const comments = state?.generalComments || {};

    const groupNumber =
      state?.groupNumber ||
      state?.currentGroup ||
      state?.group ||
      (runners[0] && (runners[0].group || runners[0].groupId)) ||
      '1';

    const evaluatorName =
      state?.evaluatorName ||
      state?.assessorName ||
      state?.instructorName ||
      state?.trainerName ||
      state?.coachName ||
      state?.currentUser?.name ||
      localStorage.getItem('evaluatorName') ||
      '—';

    const now = new Date();
    const dateTimeStr = now.toLocaleDateString('he-IL') + ', ' +
      now.toLocaleTimeString('he-IL', { hour12: false });

    // חישוב ציונים בטוחות
    function safeScore(fnName, runner) {
      try { if (typeof window[fnName] === 'function') return window[fnName](runner); }
      catch (e) { console.warn('safeScore error', fnName, e); }
      return 0;
    }

    // Enriched for summary
    const enriched = runners.map(r => {
      const shoulder = r.shoulderNumber;
      const status = runnerStatuses[shoulder] || 'פעיל';
      let sprint = 0, crawl = 0, stretcher = 0, total = 0;
      if (status === 'פעיל') {
        const baseSprint = safeScore('calculateSprintFinalScore', r);
        const baseCrawl = safeScore('calculateCrawlingFinalScore', r);
        const baseStretcher = safeScore('calculateStretcherFinalScore', r);
        const manual = manualScores[shoulder] || {};
        sprint = (typeof manual.sprint === 'number') ? manual.sprint : baseSprint;
        crawl = (typeof manual.crawl === 'number') ? manual.crawl : baseCrawl;
        stretcher = (typeof manual.stretcher === 'number') ? manual.stretcher : baseStretcher;
        total = sprint + crawl + stretcher;
      } else {
        total = -1;
      }
      return {
        shoulder, sprint, crawl, stretcher, total,
        status, comment: comments[shoulder] || ''
      };
    });

    // דירוג
    const activeSorted = enriched.filter(r => r.status === 'פעיל')
      .sort((a, b) => b.total - a.total);
    activeSorted.forEach((r, idx) => r.rank = idx + 1);
    const inactive = enriched.filter(r => r.status !== 'פעיל')
      .map(r => ({ ...r, rank: '' }));
    const finalRows = [...activeSorted, ...inactive];

    // ----- יצירת גליונות -----
    addGeneralSummarySheet(wb, {
      finalRows,
      evaluatorName,
      groupNumber,
      dateTimeStr
    });
    addSprintsSheet(wb, {
      evaluatorName, groupNumber, dateTimeStr,
      runners, manualScores
    });
    addCrawlingSummarySheet(wb, {
      runners, manualScores, runnerStatuses, comments
    });
    addStretcherSheet(wb, {
      runners, manualScores, comments
    });
    addSociometricStretcherSheet(wb, {
      runners, manualScores, comments
    });
    addMovementRawSheet(wb, { runnerStatuses });

    // ----- כתיבה -----
    const buffer = await wb.xlsx.writeBuffer();
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  };

  /* ========== Sheet Builders ========== */

  function addGeneralSummarySheet(wb, { finalRows, evaluatorName, groupNumber, dateTimeStr }) {
    const ws = wb.addWorksheet('סיכום כללי', {
      views: [{ state: 'frozen', ySplit: 5, rightToLeft: true }]
    });

    // Metadata
    ws.getCell('A1').value = 'שם מעריך:';
    ws.getCell('B1').value = evaluatorName;
    ws.getCell('A2').value = 'מספר קבוצה:';
    ws.getCell('B2').value = groupNumber;
    ws.getCell('A3').value = 'תאריך ושעה:';
    ws.getCell('B3').value = dateTimeStr;
    for (let r = 1; r <= 3; r++) {
      const c = ws.getCell(r, 1);
      c.font = { bold: true };
      c.alignment = { horizontal: 'right' };
    }
    ws.getRow(4).height = 6;

    const headers = [
      'דירוג',
      'מס\' כתף',
      'ציון ספרינטים (1-7)',
      'ציון זחילה (1-7)',
      'ציון אלונקות (1-7)',
      'סה"כ',
      'הערות כלליות'
    ];
    ws.addRow([]); // placeholder (row4 already)
    const headerRow = ws.addRow(headers);
    styleHeaderRow(headerRow);

    let currentRow = 6;
    finalRows.forEach(r => {
      const row = ws.addRow([
        r.rank || '',
        r.shoulder,
        r.sprint,
        r.crawl,
        r.stretcher,
        r.total > 0 ? r.total : '',
        r.comment
      ]);
      baseDataRowStyle(row, currentRow);
      if (r.rank && r.rank <= 3) highlightTop(row, r.rank);
      currentRow++;
    });

    ws.autoFilter = {
      from: { row: 5, column: 1 },
      to: { row: 5, column: headers.length }
    };
    autoFit(ws, { min: 10, max: 40, wrapCols: [7] });
    ws.getColumn(7).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
  }

  function addSprintsSheet(wb, { runners, manualScores }) {
    const ws = wb.addWorksheet('ספרינטים', {
      views: [{ state: 'frozen', ySplit: 1, rightToLeft: true }]
    });

    // לוודא שיש לנו נתוני מקצים
    const heats = state?.heats || [];
    
    if (heats.length === 0) {
      // אין מקצים - הראה טבלה פשוטה
      const headerRow = ws.addRow(['מס\' כתף','ציון ספרינט (1-7)','הערה']);
      styleHeaderRow(headerRow);

      runners.forEach(r => {
        const manual = manualScores?.[r.shoulderNumber] || {};
        const score = typeof manual.sprint === 'number'
          ? manual.sprint
          : safeScore('calculateSprintFinalScore', r);
        const row = ws.addRow([r.shoulderNumber, score, '']);
        baseDataRowStyle(row, row.number);
      });
    } else {
      // הראה מקצים
      heats.forEach((heat, hIdx) => {
        if (!heat || !heat.arrivals) return;
        
        // כותרת מקצה
        const titleRow = ws.addRow([`ספרינט – מקצה ${hIdx+1}`]);
        styleSectionTitle(ws, titleRow);
        ws.mergeCells(`A${titleRow.number}:E${titleRow.number}`);

        const headerRow = ws.addRow(['מס\' כתף','דירוג במקצה','זמן הגעה','ציון ספרינט (1-7)','הערה']);
        styleHeaderRow(headerRow);

        // מיון לפי זמן הגעה
        const arrivals = [...heat.arrivals].sort((a, b) => {
          const timeA = parseTimeToSeconds(a.time);
          const timeB = parseTimeToSeconds(b.time);
          return timeA - timeB;
        });

        arrivals.forEach((arrival, idx) => {
          const runner = runners.find(r => r.shoulderNumber === arrival.shoulderNumber);
          const manual = manualScores?.[arrival.shoulderNumber] || {};
          const score = typeof manual.sprint === 'number'
            ? manual.sprint
            : safeScore('calculateSprintFinalScore', runner);
          
          const timeDisplay = formatTime(arrival.time);
          const row = ws.addRow([arrival.shoulderNumber, idx+1, timeDisplay, score, '']);
          baseDataRowStyle(row, row.number);
        });

        // רווח אחרי מקצה (לא האחרון)
        if (hIdx < heats.length - 1) ws.addRow([]);
      });
    }

    autoFit(ws, { min: 8, max: 32 });
  }

  function addSociometricStretcherSheet(wb, { runners, manualScores, comments }) {
    const ws = wb.addWorksheet('פירוט אלונקות וג\'ריקנים', {
      views: [{ state: 'frozen', ySplit: 1, rightToLeft: true }]
    });

    const headers = [
      'מס\' כתף',
      'פעמים אלונקה',
      'פעמים ג\'ריקן',
      'ציון אלונקות (1-7)',
      'הערה'
    ];
    const headerRow = ws.addRow(headers);
    styleHeaderRow(headerRow);

    runners.forEach(r => {
      const shoulder = r.shoulderNumber;
      const { stretcherCount, jerricanCount } = getStretcherCounts(shoulder);
      
      const manual = manualScores?.[shoulder];
      const base = safeScore('calculateStretcherFinalScore', r);
      const score = typeof manual?.stretcher === 'number' ? manual.stretcher : base;
      const comment = comments[shoulder] || '';
      
      const row = ws.addRow([shoulder, stretcherCount, jerricanCount, score, comment]);
      baseDataRowStyle(row, row.number);
    });

    autoFit(ws, { min: 8, max: 35, wrapCols: [5] });
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
  }

  function addCrawlingSummarySheet(wb, { runners, manualScores, runnerStatuses, comments }) {
    const ws = wb.addWorksheet('סיכום זחילות', {
      views: [{ state: 'frozen', ySplit: 1, rightToLeft: true }]
    });

    // הוספת מקצי זחילה עם זמנים
    const crawlHeats = state?.crawlingDrills?.sprints || [];
    
    if (crawlHeats.length === 0) {
      // אין מקצי זחילה - טבלה פשוטה
      const headers = ['מס\' כתף', 'ציון זחילה (1-7)', 'סטטוס', 'הערת זחילה'];
      const headerRow = ws.addRow(headers);
      styleHeaderRow(headerRow);

      runners.forEach(r => {
        const shoulder = r.shoulderNumber;
        const manual = manualScores?.[shoulder];
        const base = safeScore('calculateCrawlingFinalScore', r);
        const score = typeof manual?.crawl === 'number' ? manual.crawl : base;
        const status = runnerStatuses[shoulder] || 'פעיל';
        const comment = comments[shoulder] || '';
        const row = ws.addRow([shoulder, score, status, comment]);
        baseDataRowStyle(row, row.number);
      });
    } else {
      // הראה מקצי זחילה עם זמנים
      crawlHeats.forEach((heat, hIdx) => {
        if (!heat || !heat.arrivals) return;
        
        // כותרת מקצה זחילה
        const titleRow = ws.addRow([`זחילה – מקצה ${hIdx+1}`]);
        styleSectionTitle(ws, titleRow);
        ws.mergeCells(`A${titleRow.number}:F${titleRow.number}`);

        const headerRow = ws.addRow(['מס\' כתף','דירוג במקצה','זמן זחילה','זמן שק חול','ציון זחילה (1-7)','הערה']);
        styleHeaderRow(headerRow);

        // מיון לפי זמן זחילה
        const arrivals = [...heat.arrivals].sort((a, b) => {
          const timeA = parseTimeToSeconds(a.time);
          const timeB = parseTimeToSeconds(b.time);
          return timeA - timeB;
        });

        arrivals.forEach((arrival, idx) => {
          const runner = runners.find(r => r.shoulderNumber === arrival.shoulderNumber);
          const manual = manualScores?.[arrival.shoulderNumber] || {};
          const score = typeof manual.crawl === 'number'
            ? manual.crawl
            : safeScore('calculateCrawlingFinalScore', runner);
          
          const crawlTime = formatTime(arrival.time);
          
          // חיפוש זמן שק חול
          const sackTime = getSackTime(arrival.shoulderNumber, hIdx);
          
          const row = ws.addRow([
            arrival.shoulderNumber, 
            idx+1, 
            crawlTime, 
            sackTime,
            score, 
            ''
          ]);
          baseDataRowStyle(row, row.number);
        });

        // רווח אחרי מקצה (לא האחרון)
        if (hIdx < crawlHeats.length - 1) ws.addRow([]);
      });

      // הוספת סיכום כללי בסוף
      ws.addRow([]);
      const summaryTitleRow = ws.addRow(['סיכום כללי']);
      styleSectionTitle(ws, summaryTitleRow);
      ws.mergeCells(`A${summaryTitleRow.number}:D${summaryTitleRow.number}`);

      const summaryHeaderRow = ws.addRow(['מס\' כתף', 'ציון זחילה (1-7)', 'סטטוס', 'הערת זחילה']);
      styleHeaderRow(summaryHeaderRow);

      runners.forEach(r => {
        const shoulder = r.shoulderNumber;
        const manual = manualScores?.[shoulder];
        const base = safeScore('calculateCrawlingFinalScore', r);
        const score = typeof manual?.crawl === 'number' ? manual.crawl : base;
        const status = runnerStatuses[shoulder] || 'פעיל';
        const comment = comments[shoulder] || '';
        const row = ws.addRow([shoulder, score, status, comment]);
        baseDataRowStyle(row, row.number);
      });
    }

    autoFit(ws, { min: 8, max: 35, wrapCols: [6, 4] });
  }

  function addStretcherSheet(wb, { runners, manualScores, comments }) {
    const ws = wb.addWorksheet('אלונקות', {
      views: [{ state: 'frozen', ySplit: 1, rightToLeft: true }]
    });
    const headers = [
      'מס\' כתף',
      'ציון אלונקות (1-7)',
      'RAW (זמנים/חלקים)',
      'הערה'
    ];
    const headerRow = ws.addRow(headers);
    styleHeaderRow(headerRow);

    runners.forEach(r => {
      const shoulder = r.shoulderNumber;
      const manual = manualScores?.[shoulder];
      const base = safeScore('calculateStretcherFinalScore', r);
      const score = typeof manual?.stretcher === 'number' ? manual.stretcher : base;
      const raw = getStretcherRaw(shoulder);
      const comment = comments[shoulder] || '';
      const row = ws.addRow([shoulder, score, raw, comment]);
      baseDataRowStyle(row, row.number);
    });

    autoFit(ws, { min: 8, max: 40, wrapCols: [4] });
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
  }

  function addMovementRawSheet(wb, { runnerStatuses }) {
    const ws = wb.addWorksheet('נתוני תנועה גולמיים', {
      views: [{ state: 'frozen', ySplit: 0, rightToLeft: true }]
    });

    // ספרינטים
    const sprintHeats = state?.heats || [];
    if (sprintHeats.length > 0) {
      const sprintTitleRow = ws.addRow(['=== נתוני ספרינטים ===']);
      styleSectionTitle(ws, sprintTitleRow);
      ws.mergeCells(`A${sprintTitleRow.number}:D${sprintTitleRow.number}`);
      ws.addRow([]);

      sprintHeats.forEach((heat, i) => {
        if (!heat || !heat.arrivals) return;
        addHeatSection({
          ws,
          title: `ספרינט – מקצה ${i+1}`,
          heat,
          colsMerge: 3
        });
        ws.addRow([]);
      });
    }

    // זחילות
    const crawlHeats = state?.crawlingDrills?.sprints || [];
    if (crawlHeats.length > 0) {
      const crawlTitleRow = ws.addRow(['=== נתוני זחילות ===']);
      styleSectionTitle(ws, crawlTitleRow);
      ws.mergeCells(`A${crawlTitleRow.number}:E${crawlTitleRow.number}`);
      ws.addRow([]);

      crawlHeats.forEach((heat, i) => {
        if (!heat || !heat.arrivals) return;
        addCrawlHeatSection({
          ws,
          title: `זחילה – מקצה ${i+1}`,
          heat,
          heatIndex: i,
          colsMerge: 4
        });
        if (i < crawlHeats.length - 1) ws.addRow([]);
      });
    }

    // אלונקות סוציומטריות
    const stretcherHeats = state?.sociometricStretcher?.heats || [];
    if (stretcherHeats.length > 0) {
      ws.addRow([]);
      const stretcherTitleRow = ws.addRow(['=== נתוני אלונקות סוציומטריות ===']);
      styleSectionTitle(ws, stretcherTitleRow);
      ws.mergeCells(`A${stretcherTitleRow.number}:D${stretcherTitleRow.number}`);
      ws.addRow([]);

      stretcherHeats.forEach((heat, i) => {
        if (!heat || !heat.selections) return;
        addStretcherHeatSection({
          ws,
          title: `אלונקה – מקצה ${i+1}`,
          heat,
          colsMerge: 3
        });
        if (i < stretcherHeats.length - 1) ws.addRow([]);
      });
    }

    autoFit(ws, { min: 8, max: 25 });
  }

  /* ====== פונקציות עזר ====== */

  function getStretcherCounts(shoulderNumber) {
    let stretcherCount = 0;
    let jerricanCount = 0;
    
    const heats = state?.sociometricStretcher?.heats || [];
    heats.forEach(heat => {
      if (heat.selections && heat.selections[shoulderNumber]) {
        const selection = heat.selections[shoulderNumber];
        if (selection === 'stretcher') {
          stretcherCount++;
        } else if (selection === 'jerrican') {
          jerricanCount++;
        }
      }
    });
    
    return { stretcherCount, jerricanCount };
  }

  function formatTime(timeObj) {
    if (!timeObj) return '';
    if (typeof timeObj === 'string') return timeObj;
    if (typeof timeObj === 'number') {
      const minutes = Math.floor(timeObj / 60);
      const seconds = (timeObj % 60).toFixed(2);
      return `${minutes}:${seconds.padStart(5, '0')}`;
    }
    if (timeObj.minutes !== undefined && timeObj.seconds !== undefined) {
      return `${timeObj.minutes}:${timeObj.seconds.toString().padStart(2, '0')}`;
    }
    return String(timeObj);
  }

  function addHeatSection({ ws, title, heat, colsMerge = 3 }) {
    // כותרת
    const tRow = ws.addRow([title]);
    styleSectionTitle(ws, tRow);
    ws.mergeCells(tRow.number, 1, tRow.number, colsMerge);

    const headerRow = ws.addRow(['דירוג','מס\' כתף','זמן הגעה']);
    styleHeaderRow(headerRow);

    const arrivals = heat?.arrivals || [];
    // מיון לפי זמן
    const sortedArrivals = [...arrivals].sort((a, b) => {
      return parseTimeToSeconds(a.time) - parseTimeToSeconds(b.time);
    });

    sortedArrivals.forEach((arrival, idx) => {
      const timeDisplay = formatTime(arrival.time);
      const row = ws.addRow([idx+1, arrival.shoulderNumber, timeDisplay]);
      baseDataRowStyle(row, row.number);
    });
  }

  function parseTimeToSeconds(val) {
    if (val == null || val === '') return Number.POSITIVE_INFINITY;
    if (typeof val === 'number') return val;
    if (typeof val === 'object' && val.minutes !== undefined && val.seconds !== undefined) {
      return val.minutes * 60 + val.seconds;
    }
    const s = String(val).trim();
    // פורמט אפשרי mm:ss.ms או ss.ms או ss
    const mmMatch = /^(\d+):(\d{1,2})([.,](\d+))?$/.exec(s);
    if (mmMatch) {
      const m = parseInt(mmMatch[1],10);
      const sec = parseInt(mmMatch[2],10);
      const frac = mmMatch[4] ? parseFloat('0.'+mmMatch[4]) : 0;
      return m*60 + sec + frac;
    }
    const secMatch = /^(\d+)([.,](\d+))?$/.exec(s);
    if (secMatch) {
      const base = parseInt(secMatch[1],10);
      const frac = secMatch[3] ? parseFloat('0.'+secMatch[3]) : 0;
      return base + frac;
    }
    return Number.POSITIVE_INFINITY;
  }

  function styleSectionTitle(ws, row) {
    row.font = { bold: true, size: 12, color: { argb: 'FF0F172A' } };
    row.alignment = { horizontal: 'center', vertical: 'middle' };
    row.height = 18;
    row.eachCell(c => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      c.border = boxBorder();
    });
  }

  function styleHeaderRow(row) {
    row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    row.height = 18;
    row.eachCell(c => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      c.border = boxBorder();
    });
  }

  function baseDataRowStyle(row, rowNum) {
    row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    if (rowNum % 2 === 0) {
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      });
    }
    row.eachCell(c => { c.border = boxBorder(); });
  }

  function highlightTop(row, rank) {
    const color =
      rank === 1 ? 'FFFDE68A' :
      rank === 2 ? 'FFE2E8F0' :
      'FFF2E8DC';
    row.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    });
  }

  function getStretcherRaw(shoulder) {
    const { stretcherCount, jerricanCount } = getStretcherCounts(shoulder);
    return `${stretcherCount} אלונקות, ${jerricanCount} ג'ריקנים`;
  }

  function boxBorder() {
    return {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  }

  function autoFit(ws, { min = 8, max = 60, wrapCols = [] } = {}) {
    ws.columns.forEach((col, idx) => {
      let maxLen = min;
      col.eachCell({ includeEmpty: true }, cell => {
        const v = cell.value == null ? '' : String(cell.value);
        maxLen = Math.max(maxLen, v.length + 2);
      });
      col.width = Math.min(max, maxLen);
      if (wrapCols.includes(idx + 1)) {
        col.alignment = { wrapText: true, vertical: 'top', horizontal: 'center' };
      }
    });
  }

  function safeScore(fnName, runner) {
    try { if (typeof window[fnName] === 'function') return window[fnName](runner); }
    catch (e) { console.warn('safeScore error', fnName, e); }
    return 0;
  }

  function getSackTime(shoulderNumber, heatIndex) {
    // חיפוש זמן שק חול עבור רץ ומקצה ספציפיים
    const sackData = state?.crawlingDrills?.sackCarryTimes;
    if (!sackData) return '';
    
    // Structure: sackCarryTimes[heatIndex][shoulderNumber] = timeObj
    const heatSackTimes = sackData[heatIndex];
    if (!heatSackTimes || !heatSackTimes[shoulderNumber]) return '';
    
    return formatTime(heatSackTimes[shoulderNumber]);
  }

  function formatTime(timeObj) {
    if (!timeObj) return '';
    if (typeof timeObj === 'string') return timeObj;
    if (typeof timeObj === 'number') {
      const minutes = Math.floor(timeObj / 60);
      const seconds = (timeObj % 60).toFixed(2);
      return `${minutes}:${seconds.padStart(5, '0')}`;
    }
    if (timeObj.minutes !== undefined && timeObj.seconds !== undefined) {
      const totalSeconds = timeObj.minutes * 60 + timeObj.seconds;
      const minutes = Math.floor(totalSeconds / 60);
      const secs = (totalSeconds % 60).toFixed(2);
      return `${minutes}:${secs.padStart(5, '0')}`;
    }
    return String(timeObj);
  }

  function addCrawlHeatSection({ ws, title, heat, heatIndex, colsMerge = 4 }) {
    // כותרת
    const tRow = ws.addRow([title]);
    styleSectionTitle(ws, tRow);
    ws.mergeCells(tRow.number, 1, tRow.number, colsMerge);

    const headerRow = ws.addRow(['דירוג','מס\' כתף','זמן זחילה','זמן שק חול']);
    styleHeaderRow(headerRow);

    const arrivals = heat?.arrivals || [];
    // מיון לפי זמן זחילה
    const sortedArrivals = [...arrivals].sort((a, b) => {
      return parseTimeToSeconds(a.time) - parseTimeToSeconds(b.time);
    });

    sortedArrivals.forEach((arrival, idx) => {
      const crawlTime = formatTime(arrival.time);
      const sackTime = getSackTime(arrival.shoulderNumber, heatIndex);
      const row = ws.addRow([idx+1, arrival.shoulderNumber, crawlTime, sackTime]);
      baseDataRowStyle(row, row.number);
    });
  }

  function addStretcherHeatSection({ ws, title, heat, colsMerge = 3 }) {
    // כותרת
    const tRow = ws.addRow([title]);
    styleSectionTitle(ws, tRow);
    ws.mergeCells(tRow.number, 1, tRow.number, colsMerge);

    const headerRow = ws.addRow(['מס\' כתף','תפקיד','הערה']);
    styleHeaderRow(headerRow);

    const selections = heat?.selections || {};
    Object.entries(selections).forEach(([shoulderNumber, role]) => {
      const roleText = role === 'stretcher' ? 'אלונקה' : 
                      role === 'jerrican' ? 'ג\'ריקן' : role;
      const row = ws.addRow([shoulderNumber, roleText, '']);
      baseDataRowStyle(row, row.number);
    });
  }

})();