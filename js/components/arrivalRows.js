(function(){
  window.ArrivalRows = window.ArrivalRows || {};

  // טעינת קובץ CSS יעודי לרכיב
  function ensureArrivalRowsCSS(){
    if (document.getElementById('arrival-rows-css')) return;
    const link = document.createElement('link');
    link.id = 'arrival-rows-css';
    link.rel = 'stylesheet';
    link.href = 'css/arrival-rows.css';
    document.head.appendChild(link);
  }

  function defaultTruncate(raw, max = 20){
    if (raw == null) return 'כתוב הערה...';
    let str;
    if (Array.isArray(raw)){
      str = raw.filter(c=>c && c.trim()).join(' | ');
    } else {
      str = String(raw||'').trim();
    }
    if (!str) return 'כתוב הערה...';
    const single = str.replace(/\s+/g,' ');
    return single.length > max ? single.slice(0, max-3) + '...' : single;
  }

  window.ArrivalRows.render = function renderArrivalRows(opts){
    // וידוא טעינת CSS לפני רינדור
    ensureArrivalRowsCSS();

    const {
      arrivals = [],
      getComment,
      formatTime,
      truncate = defaultTruncate,
      maxChars = 20,
      variant = 'float',
      showHeader = true,
      labels = { shoulder:'מספר כתף', comment:'הערות', time:'זמן' },
      listId = 'arrival-list',
      onCommentClick,
      hideCommentsColumn = false
    } = opts;

    const headerHtml = (showHeader && arrivals.length) ? `
      <div class="arrival-header">
        <span class="h-cell static-position">מיקום</span>
        <span class="h-cell shoulder">מס' כתף</span>
        ${!hideCommentsColumn ? `<span class="h-cell comment">${labels.comment}</span>` : ''}
        <span class="h-cell time">${labels.time}</span>
      </div>` : '';

    const rowsHtml = arrivals.map((a, idx) => {
      const sn = a.shoulderNumber;
      const raw = getComment ? getComment(sn) : undefined;
      const has = Array.isArray(raw) ? raw.some(c=>c && c.trim()) : !!(raw && String(raw).trim());
      const display = truncate(raw, maxChars);
      const timeText = a.finishTime != null ? formatTime(a.finishTime) : (a.comment || '');
      const staticPosition = idx + 1;
      
      return `
        <div class="arrival-row ${variant}" data-shoulder-number="${sn}">
          <span class="static-position">${staticPosition}</span>
          <span class="shoulder-cell">${sn}</span>
          <span class="comment-cell">
            <button class="comment-btn ${has ? '' : 'comment-btn-empty'}" data-comment-btn="${sn}">
              <span class="comment-text">${display}</span>
              <span class="comment-icon" aria-hidden="true">✎</span>
            </button>
          </span>
          <span class="time-cell">${timeText}</span>
        </div>`;
    }).join('');

    return `
      <div class="arrival-section">
        ${headerHtml}
        <div id="${listId}" class="${hideCommentsColumn ? 'hide-comments' : ''}">
          ${rowsHtml}
        </div>
      </div>`;
  };

  // חיבור מאזיני הערה אחרי שהכנסת את ה-HTML לדף
  window.ArrivalRows.attachCommentHandlers = function(container, { onOpen }){
    container.querySelectorAll('[data-comment-btn]').forEach(btn=>{
      btn.addEventListener('click', ()=> {
        const sn = btn.getAttribute('data-comment-btn');
        onOpen && onOpen(sn, btn);
      });
    });
  };

})();