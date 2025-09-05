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
      'שם מעריך',
      'מספר קבוצה',
      'הערות כלליות',
      'תאריך ושעה'
    ];
    ws.addRow([]); // placeholder (row4 already)
    ws.addRow(headers);
    const headerRow = ws.getRow(5);
    headerRow.values = headers;
    styleHeaderRow(headerRow);

    let currentRow = 6;
    finalRows.forEach(r => {
      const row = ws.getRow(currentRow);
      row.values = [
        r.rank || '',
        r.shoulder,
        r.sprint,
        r.crawl,
        r.stretcher,
        evaluatorName,
        groupNumber,
        r.comment,
        dateTimeStr
      ];
      baseDataRowStyle(row, currentRow);
      if (r.rank && r.rank <= 3) highlightTop(row, r.rank);
      currentRow++;
    });

    ws.autoFilter = {
      from: { row: 5, column: 1 },
      to: { row: 5, column: headers.length }
    };
    autoFit(ws, { min: 10, max: 40, wrapCols: [8] });
    ws.getColumn(8).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
  }

  function addSprintsSheet(wb, { runners, manualScores }) {
    const ws = wb.addWorksheet('ספרינטים', {
      views: [{ state: 'frozen', ySplit: 1, rightToLeft: true }]
    });

    const heats = extractSprintHeats();
    if (heats.length === 0) {
      // טבלה בודדת מכל הרצים (אין מקצים)
      styleSectionTitle(ws, ws.addRow(['ספרינטים – כלל הרצים']));
      ws.mergeCells(`A1:E1`);
      const headerRow = ws.addRow(['מס\' כתף','דירוג','זמן הגעה','ציון ספרינט (1-7)','הערה']);
      styleHeaderRow(headerRow);

      const rows = runners.map(r => {
        const manual = manualScores?.[r.shoulderNumber] || {};
        const score = typeof manual.sprint === 'number'
          ? manual.sprint
          : safeScore('calculateSprintFinalScore', r);
        const raw = r.sprintTime || r.sprintRaw || '';
        return { shoulder: r.shoulderNumber, time: raw, score };
      });

      // דירוג כללי לפי זמן
      rows.sort((a,b) => parseTimeToSeconds(a.time) - parseTimeToSeconds(b.time));
      rows.forEach((r, idx) => {
        const row = ws.addRow([r.shoulder, idx+1, r.time, r.score, '']);
        baseDataRowStyle(row, row.number);
      });
    } else {
      let startRow = 1;
      heats.forEach((heat, hIdx) => {
        // כותרת מקצה
        const titleRow = ws.addRow([`ספרינט – מקצה ${hIdx+1}`]);
        styleSectionTitle(ws, titleRow);
        ws.mergeCells(`A${titleRow.number}:E${titleRow.number}`);

        const headerRow = ws.addRow(['מס\' כתף','דירוג במקצה','זמן הגעה','ציון ספרינט (1-7)','הערה']);
        styleHeaderRow(headerRow);

        // נבנה מערך תוצאות
        const list = heat?.runners || heat?.results || [];
        const results = list.map((res) => {
          const shoulder = res.shoulderNumber || res.shoulder || res.id;
            const runner = runners.find(r => r.shoulderNumber == shoulder) || {};
            const manual = manualScores?.[shoulder] || {};
            const score = typeof manual.sprint === 'number'
              ? manual.sprint
              : safeScore('calculateSprintFinalScore', runner);
            const rawTime = res.time || res.rawTime || res.display || '';
            return { shoulder, time: rawTime, score };
        });

        results.sort((a,b)=> parseTimeToSeconds(a.time) - parseTimeToSeconds(b.time));

        results.forEach((r, idx) => {
          const row = ws.addRow([r.shoulder, idx+1, r.time, r.score, '']);
          baseDataRowStyle(row, row.number);
        });

        // רווח אחרי מקצה (לא האחרון)
        if (hIdx < heats.length - 1) ws.addRow([]);
        startRow = ws.rowCount + 1;
      });
    }

    autoFit(ws, { min: 8, max: 32 });
  }

  function addCrawlingSummarySheet(wb, { runners, manualScores, runnerStatuses, comments }) {
    const ws = wb.addWorksheet('סיכום זחילות', {
      views: [{ state: 'frozen', ySplit: 1, rightToLeft: true }]
    });
    const headers = [
      'מס\' כתף',
      'ציון זחילה (1-7)',
      'סטטוס',
      'הערת זחילה'
    ];
    ws.addRow(headers);
    styleHeaderRow(ws.getRow(1));

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

    autoFit(ws, { min: 8, max: 35, wrapCols: [4] });
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
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
    ws.addRow(headers);
    styleHeaderRow(ws.getRow(1));

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

    let currentBlock = 1;

    const sprintHeats = extractSprintHeats();
    sprintHeats.forEach((heat, i) => {
      addHeatSection({
        ws,
        title: `ספרינט – מקצה ${i+1}`,
        heat,
        colsMerge: 3
      });
      ws.addRow([]);
      currentBlock = ws.rowCount + 1;
    });

    const crawlHeats = extractCrawlHeats();
    crawlHeats.forEach((heat, i) => {
      addHeatSection({
        ws,
        title: `זחילה – מקצה ${i+1}`,
        heat,
        colsMerge: 3
      });
      if (i < crawlHeats.length - 1) ws.addRow([]);
      currentBlock = ws.rowCount + 1;
    });

    autoFit(ws, { min: 8, max: 25 });
  }

  /* ====== מקטעי עזר חדשים ====== */

  function addHeatSection({ ws, title, heat, colsMerge = 3 }) {
    // כותרת
    const tRow = ws.addRow([title]);
    styleSectionTitle(ws, tRow);
    ws.mergeCells(tRow.number, 1, tRow.number, colsMerge);

    const headerRow = ws.addRow(['דירוג','מס\' כתף','זמן הגעה']);
    styleHeaderRow(headerRow);

    const list = heat?.runners || heat?.results || [];
    // נבנה results עם parse זמן
    const results = list.map(res => {
      const shoulder = res.shoulderNumber || res.shoulder || res.id;
      const rawTime = res.time || res.rawTime || res.display || res.arrivalTime || '';
      return {
        shoulder,
        time: rawTime,
        seconds: parseTimeToSeconds(rawTime)
      };
    });

    results.sort((a,b)=> a.seconds - b.seconds);

    results.forEach((r, idx) => {
      const row = ws.addRow([idx+1, r.shoulder, r.time]);
      baseDataRowStyle(row, row.number);
    });
  }

  function extractSprintHeats() {
    return (state?.sprintHeats || state?.heats || []).filter(h => h);
  }

  function extractCrawlHeats() {
    return (state?.crawlHeats ||
            state?.crawlingHeats ||
            state?.crawlingDrills?.heats ||
            []) .filter(h => h);
  }

  function parseTimeToSeconds(val) {
    if (val == null || val === '') return Number.POSITIVE_INFINITY;
    if (typeof val === 'number') return val;
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

  /* ========== Helpers (Shared) ========== */

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

  function getStretcherRaw(/*shoulder*/) {
    // TODO: אם יש מבנה מפורט לזמני אלונקה – חבר כאן.
    return '';
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

  function formatMaybe(raw) {
    if (raw == null) return '';
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') return raw;
    try { return JSON.stringify(raw); } catch { return String(raw); }
  }

  function safeScore(fnName, runner) {
    try { if (typeof window[fnName] === 'function') return window[fnName](runner); }
    catch (e) { console.warn('safeScore error', fnName, e); }
    return 0;
  }

})();