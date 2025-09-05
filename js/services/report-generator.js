(function () {
  window.ReportGenerator = window.ReportGenerator || {};

  /**
   * פונקציה פרטית לחישוב ציון בטוח
   */
  function safeScore(fnName, runner) {
    try {
      if (typeof window[fnName] === 'function') return window[fnName](runner);
    } catch (e) {
      console.warn('safeScore error', fnName, e);
    }
    return 0;
  }

  /**
   * פונקציה ציבורית שמכינה את נתוני הדוח ויוצרת מהם קובץ Blob
   * @returns {Promise<Blob>} A promise that resolves with the Excel file Blob.
   */
  window.ReportGenerator.generateFinalReportBlob = async function (options = {}) {
    console.log('ReportGenerator: building full workbook...');
    if (!window.ExcelJS) throw new Error('ExcelJS not loaded');

    const wb = new ExcelJS.Workbook();
    wb.creator = 'GibushApp';
    wb.created = new Date();
    wb.modified = new Date();

    addSummarySheet(wb);
    addRunnersSheet(wb);
    addSprintSheet(wb);
    addCrawlingSheet(wb);
    addStretcherSheet(wb);
    addManualScoresSheet(wb);
    addCommentsSheet(wb);
    if (options.includeRaw !== false) addRawJsonSheet(wb);

    console.log('Sheets:', wb.worksheets.map(w => w.name));
    const buffer = await wb.xlsx.writeBuffer();
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  };

  /* ---------- SHEETS ---------- */

  function addSummarySheet(wb) {
    const ws = wb.addWorksheet('סיכום', { views: [{ state: 'frozen', ySplit: 1 }] });
    header(ws, ['מספר', 'סה״כ', 'ספרינט', 'זחילה', 'אלונקה', 'סטטוס', 'הערה']);
    (state.runners || []).forEach(r => {
      const scores = getRunnerScores(r);
      const status = state.crawlingDrills?.runnerStatuses?.[r.shoulderNumber] || 'פעיל';
      const comment = state.generalComments?.[r.shoulderNumber] || '';
      ws.addRow([
        r.shoulderNumber,
        scores.total,
        scores.sprint,
        scores.crawl,
        scores.stretcher,
        status,
        comment
      ]);
    });
    autoFit(ws);
  }

  function addRunnersSheet(wb) {
    const ws = wb.addWorksheet('רצים', { views: [{ state: 'frozen', ySplit: 1 }] });
    header(ws, ['#', 'סטטוס', 'הערה כללית', 'שם (אם קיים)', 'GroupId?']);
    (state.runners || []).forEach(r => {
      ws.addRow([
        r.shoulderNumber,
        state.crawlingDrills?.runnerStatuses?.[r.shoulderNumber] || 'פעיל',
        state.generalComments?.[r.shoulderNumber] || '',
        r.name || '',
        r.group || r.groupId || ''
      ]);
    });
    autoFit(ws);
  }

  function addSprintSheet(wb) {
    const ws = wb.addWorksheet('ספרינט', { views: [{ state: 'frozen', ySplit: 1 }] });
    // TODO: עדכן אם מבנה הנתונים שונה
    header(ws, ['מספר', 'מקצה', 'מיקום במקצה', 'זמן (RAW)', 'זמן (פורמט)', 'ציוני ביניים?', 'ציון סופי']);
    const heats = state.sprintHeats || state.heats || []; // ניחוש שמות
    heats.forEach((heat, heatIdx) => {
      (heat.runners || heat.results || []).forEach((runnerResult, pos) => {
        const shoulder = runnerResult.shoulderNumber || runnerResult.shoulder || runnerResult.id;
        const runnerObj = (state.runners || []).find(r => r.shoulderNumber == shoulder) || { shoulderNumber: shoulder };
        const scores = getRunnerScores(runnerObj);
        const raw = runnerResult.time || runnerResult.rawTime || '';
        const formatted = formatMaybe(raw);
        ws.addRow([
          shoulder,
            heatIdx + 1,
            pos + 1,
            raw,
            formatted,
            runnerResult.splitTimes ? JSON.stringify(runnerResult.splitTimes) : '',
            scores.sprint
        ]);
      });
    });
    autoFit(ws);
  }

  function addCrawlingSheet(wb) {
    const ws = wb.addWorksheet('זחילה', { views: [{ state: 'frozen', ySplit: 1 }] });
    // TODO: עדכן אם קיימת לוגיקת שלבי זחילה / תרגילים שונים
    header(ws, ['מספר', 'ציון בסיס', 'ציון ידני (אם קיים)', 'סטטוס', 'הערות זחילה?']);
    (state.runners || []).forEach(r => {
      const manual = state.manualScores?.[r.shoulderNumber];
      const base = safeScore('calculateCrawlingFinalScore', r);
      const status = state.crawlingDrills?.runnerStatuses?.[r.shoulderNumber] || 'פעיל';
      const comment = extractCrawlingComment(r.shoulderNumber);
      ws.addRow([
        r.shoulderNumber,
        base,
        typeof manual?.crawl === 'number' ? manual.crawl : '',
        status,
        comment
      ]);
    });
    autoFit(ws);
  }

  function addStretcherSheet(wb) {
    const ws = wb.addWorksheet('אלונקה', { views: [{ state: 'frozen', ySplit: 1 }] });
    // TODO: אם יש מבנה של "stretcherHeats" / "stretcherRounds" – לעדכן
    header(ws, ['מספר', 'זמן / אינדקסים', 'ציון בסיס', 'ידני', 'הערה?']);
    (state.runners || []).forEach(r => {
      const manual = state.manualScores?.[r.shoulderNumber];
      const base = safeScore('calculateStretcherFinalScore', r);
      // אם קיימים זמנים במבנה state.stretcherHeats לדוגמה – שלוף
      const rawTimes = getStretcherTimes(r.shoulderNumber);
      ws.addRow([
        r.shoulderNumber,
        rawTimes,
        base,
        typeof manual?.stretcher === 'number' ? manual.stretcher : '',
        ''
      ]);
    });
    autoFit(ws);
  }

  function addManualScoresSheet(wb) {
    const ws = wb.addWorksheet('ציונים ידניים', { views: [{ state: 'frozen', ySplit: 1 }] });
    header(ws, ['מספר', 'ספרינט', 'זחילה', 'אלונקה']);
    Object.entries(state.manualScores || {}).forEach(([shoulderNumber, obj]) => {
      ws.addRow([
        shoulderNumber,
        typeof obj.sprint === 'number' ? obj.sprint : '',
        typeof obj.crawl === 'number' ? obj.crawl : '',
        typeof obj.stretcher === 'number' ? obj.stretcher : ''
      ]);
    });
    autoFit(ws);
  }

  function addCommentsSheet(wb) {
    const ws = wb.addWorksheet('הערות כלליות', { views: [{ state: 'frozen', ySplit: 1 }] });
    header(ws, ['מספר', 'הערה']);
    Object.entries(state.generalComments || {}).forEach(([shoulderNumber, comment]) => {
      ws.addRow([shoulderNumber, comment]);
    });
    autoFit(ws);
  }

  function addRawJsonSheet(wb) {
    const ws = wb.addWorksheet('RAW', { views: [{ state: 'frozen', ySplit: 1 }] });
    header(ws, ['Key', 'JSON']);
    const keys = [
      'runners',
      'manualScores',
      'generalComments',
      'crawlingDrills',
      'sprintHeats',
      'heats',
      'stretcherHeats'
    ];
    keys.forEach(k => {
      if (state[k] !== undefined) {
        ws.addRow([k, JSON.stringify(state[k])]);
      }
    });
    autoFit(ws);
  }

  /* ---------- HELPERS ---------- */

  function getRunnerScores(r) {
    const manual = state.manualScores?.[r.shoulderNumber] || {};
    const sprint = typeof manual.sprint === 'number' ? manual.sprint : safeScore('calculateSprintFinalScore', r);
    const crawl = typeof manual.crawl === 'number' ? manual.crawl : safeScore('calculateCrawlingFinalScore', r);
    const stretcher = typeof manual.stretcher === 'number' ? manual.stretcher : safeScore('calculateStretcherFinalScore', r);
    return { sprint, crawl, stretcher, total: sprint + crawl + stretcher };
  }

  function header(ws, arr) {
    const row = ws.addRow(arr);
    row.font = { bold: true };
    row.alignment = { vertical: 'middle', horizontal: 'center' };
    row.eachCell(c => {
      c.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' }
      };
      c.border = {
        top: { style: 'thin', color: { argb: 'FF888888' } },
        left: { style: 'thin', color: { argb: 'FF888888' } },
        bottom: { style: 'thin', color: { argb: 'FF888888' } },
        right: { style: 'thin', color: { argb: 'FF888888' } }
      };
    });
  }

  function autoFit(ws) {
    ws.columns?.forEach(col => {
      let max = 10;
      col.eachCell?.(cell => {
        let v = cell.value;
        if (v == null) v = '';
        if (typeof v !== 'string') v = v.toString();
        max = Math.max(max, v.length + 2);
      });
      col.width = Math.min(70, max);
    });
  }

  function formatMaybe(raw) {
    if (raw == null) return '';
    if (typeof raw === 'number') return raw.toString();
    if (typeof raw === 'string') return raw;
    return JSON.stringify(raw);
  }

  function extractCrawlingComment(shoulderNumber) {
    // עדכן אם קיימת לוגיקת הערות ייעודית לזחילה
    // כרגע נחזיר מההערות הכלליות
    return state.generalComments?.[shoulderNumber] || '';
  }

  function getStretcherTimes(shoulderNumber) {
    // TODO: אם יש מבנה מפורט של תוצאות אלונקה – עדכן כאן
    // כרגע מחזיר מחרוזת ריקה/ניחוש
    return '';
  }

})();