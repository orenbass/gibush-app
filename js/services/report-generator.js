(function () {
  window.ReportGenerator = window.ReportGenerator || {};

  /* ====== Public API ====== */
  window.ReportGenerator.generateFinalReportBlob = async function (options = {}) {
    console.log('ReportGenerator: building full workbook...');
    if (!window.ExcelJS) throw new Error('ExcelJS not loaded');

    const wb = new ExcelJS.Workbook();
    wb.creator = 'GibushApp';
    wb.created = new Date();
    wb.modified = new Date();

    // High-level summary & structured sheets
    addSummarySheet(wb);
    addRunnersSheet(wb);
    addSprintSheet(wb);
    addCrawlingSheet(wb);
    addStretcherSheet(wb);
    addManualScoresSheet(wb);
    addCommentsSheet(wb);

    // Detailed raw sheets per drill
    addSprintRawSheet(wb);
    addCrawlingRawSheet(wb);
    addStretcherRawSheet(wb);

    // Generic raw dump
    if (options.includeRaw !== false) addRawJsonSheet(wb);

    console.log('Sheets:', wb.worksheets.map(w => w.name));
    const buffer = await wb.xlsx.writeBuffer();
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  };

  /* ====== Scores helpers ====== */
  function safeScore(fnName, runner) {
    try {
      if (typeof window[fnName] === 'function') return window[fnName](runner);
    } catch (e) { console.warn('safeScore error', fnName, e); }
    return 0;
  }

  function getRunnerScores(r) {
    const manual = state.manualScores?.[r.shoulderNumber] || {};
    const sprint = typeof manual.sprint === 'number' ? manual.sprint : safeScore('calculateSprintFinalScore', r);
    const crawl = typeof manual.crawl === 'number' ? manual.crawl : safeScore('calculateCrawlingFinalScore', r);
    const stretcher = typeof manual.stretcher === 'number' ? manual.stretcher : safeScore('calculateStretcherFinalScore', r);
    return { sprint, crawl, stretcher, total: sprint + crawl + stretcher };
  }

  /* ====== Summary / Structured Sheets ====== */
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
    header(ws, ['#', 'סטטוס', 'הערה כללית', 'שם', 'קבוצה']);
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
    header(ws, ['מספר', 'מקצה', 'מיקום במקצה', 'זמן RAW', 'זמן תצוגה', 'Splits', 'ציון סופי']);
    const heats = state.sprintHeats || state.heats || [];
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
    header(ws, ['מספר', 'ציון בסיס', 'ציון ידני', 'סטטוס', 'הערת זחילה']);
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
    header(ws, ['מספר', 'Raw Times/Indexes', 'ציון בסיס', 'ידני', 'הערה']);
    (state.runners || []).forEach(r => {
      const manual = state.manualScores?.[r.shoulderNumber];
      const base = safeScore('calculateStretcherFinalScore', r);
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

  /* ====== RAW Detailed Sheets ====== */

  // Sprint Raw
  function addSprintRawSheet(wb) {
    const heats = state.sprintHeats || state.heats;
    if (!Array.isArray(heats) || !heats.length) return;
    const ws = wb.addWorksheet('Sprint Raw', { views: [{ state: 'frozen', ySplit: 1 }] });

    // Collect all dynamic keys
    const rows = [];
    heats.forEach((heat, hIdx) => {
      const list = heat.runners || heat.results || [];
      list.forEach((rRes, pos) => {
        const row = {
          heatIndex: hIdx + 1,
          positionInHeat: pos + 1,
          shoulderNumber: rRes.shoulderNumber || rRes.shoulder || rRes.id || '',
          rawTime: rRes.time || rRes.rawTime || '',
          displayTime: formatMaybe(rRes.time || rRes.rawTime),
          penalty: rRes.penalty || '',
          dnf: rRes.dnf || rRes.DNF || '',
          startTime: rRes.startTime || '',
          endTime: rRes.endTime || '',
          splitTimes: rRes.splitTimes ? JSON.stringify(rRes.splitTimes) : ''
        };
        rows.push(row);
      });
    });
    sheetFromObjects(ws, rows);
  }

  // Crawling Raw
  function addCrawlingRawSheet(wb) {
    // Guess possible raw data locations
    const drills = state.crawlingDrills;
    if (!drills) return;
    const candidateArrays = [];
    if (Array.isArray(drills.sessions)) candidateArrays.push({ name: 'sessions', arr: drills.sessions });
    if (Array.isArray(drills.drills)) candidateArrays.push({ name: 'drills', arr: drills.drills });
    if (Array.isArray(drills.events)) candidateArrays.push({ name: 'events', arr: drills.events });

    if (!candidateArrays.length) {
      // fallback: runnerStatuses as table
      const statuses = drills.runnerStatuses || {};
      const ws = wb.addWorksheet('Crawling Raw', { views: [{ state: 'frozen', ySplit: 1 }] });
      const rows = Object.entries(statuses).map(([shoulder, status]) => ({ shoulderNumber: shoulder, status }));
      sheetFromObjects(ws, rows);
      return;
    }

    // merge arrays into one with a source tag
    const merged = [];
    candidateArrays.forEach(c => {
      c.arr.forEach((item, idx) => {
        merged.push({ _source: c.name, _index: idx, ...flattenObject(item) });
      });
    });

    const ws = wb.addWorksheet('Crawling Raw', { views: [{ state: 'frozen', ySplit: 1 }] });
    sheetFromObjects(ws, merged);
  }

  // Stretcher Raw
  function addStretcherRawSheet(wb) {
    const heats = state.stretcherHeats || state.stretcherRounds || state.stretcher || [];
    if (!Array.isArray(heats) || !heats.length) return;
    const ws = wb.addWorksheet('Stretcher Raw', { views: [{ state: 'frozen', ySplit: 1 }] });
    const rows = [];
    heats.forEach((heat, hIdx) => {
      const list = heat.runners || heat.results || heat.data || [];
      list.forEach((rRes, pos) => {
        rows.push({
          heatIndex: hIdx + 1,
          positionInHeat: pos + 1,
          shoulderNumber: rRes.shoulderNumber || rRes.shoulder || rRes.id || '',
          rawTime: rRes.time || rRes.rawTime || '',
          displayTime: formatMaybe(rRes.time || rRes.rawTime),
          partials: rRes.splitTimes ? JSON.stringify(rRes.splitTimes) : '',
          meta: rRes.meta ? JSON.stringify(rRes.meta) : ''
        });
      });
    });
    sheetFromObjects(ws, rows);
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
      'stretcherHeats',
      'stretcherRounds',
      'stretcher'
    ];
    keys.forEach(k => {
      if (state[k] !== undefined) {
        ws.addRow([k, JSON.stringify(state[k])]);
      }
    });
    autoFit(ws);
  }

  /* ====== Generic Helpers ====== */

  function header(ws, arr) {
    const row = ws.addRow(arr);
    row.font = { bold: true };
    row.alignment = { vertical: 'middle', horizontal: 'center' };
    row.eachCell(c => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      c.border = ['top', 'left', 'bottom', 'right'].reduce((b, side) => {
        b[side] = { style: 'thin', color: { argb: 'FFAAAAAA' } };
        return b;
      }, {});
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
      col.width = Math.min(80, max);
    });
  }

  function formatMaybe(raw) {
    if (raw == null) return '';
    if (typeof raw === 'number') return raw.toString();
    if (typeof raw === 'string') return raw;
    return JSON.stringify(raw);
  }

  function extractCrawlingComment(shoulderNumber) {
    // ניתן להרחיב אם יש מבנה ייעודי לזחילה
    return state.generalComments?.[shoulderNumber] || '';
  }

  function getStretcherTimes(shoulderNumber) {
    // אם יש מבנה מפורט – לעדכן כאן
    return '';
  }

  function flattenObject(obj, prefix = '', out = {}) {
    if (obj == null) return out;
    if (typeof obj !== 'object') {
      out[prefix || 'value'] = obj;
      return out;
    }
    if (Array.isArray(obj)) {
      obj.forEach((v, i) => {
        flattenObject(v, prefix ? `${prefix}[${i}]` : `[${i}]`, out);
      });
      return out;
    }
    Object.keys(obj).forEach(k => {
      const val = obj[k];
      const newKey = prefix ? `${prefix}.${k}` : k;
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        flattenObject(val, newKey, out);
      } else if (Array.isArray(val)) {
        flattenObject(val, newKey, out);
      } else {
        out[newKey] = val;
      }
    });
    return out;
  }

  function sheetFromObjects(ws, rows) {
    if (!rows.length) {
      header(ws, ['EMPTY']);
      ws.addRow(['אין נתונים']);
      return;
    }
    // collect columns
    const colsSet = new Set();
    rows.forEach(r => {
      Object.keys(r).forEach(k => colsSet.add(k));
    });
    const cols = Array.from(colsSet);
    header(ws, cols);
    rows.forEach(r => {
      ws.addRow(cols.map(c => (r[c] != null ? r[c] : '')));
    });
    autoFit(ws);
  }

})();