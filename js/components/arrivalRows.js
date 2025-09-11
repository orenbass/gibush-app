(function(){
  window.ArrivalRows = window.ArrivalRows || {};

  function ensureStyles(){
    if (document.getElementById('arrival-rows-shared-style')) return;
    const st = document.createElement('style');
    st.id = 'arrival-rows-shared-style';
    st.textContent = `
      /* עטיפה כללית */
      .arrival-section{direction:rtl;width:100%}

      /* כותרת */
      .arrival-header{
        padding:4px 6px;
        color:#6b7280;
        direction:rtl;
        font-size:12px;
        display:flex;
        align-items:center;
        gap:2px;
        font-weight:600;
      }
      .arrival-header .h-cell{
        flex:0 0 88px;
        min-width:88px;
        white-space:nowrap;
        text-align:right;
      }
      .arrival-header .h-cell.time{
        text-align:left;
      }
      .arrival-header .h-cell.center{
        flex:1;
        text-align:center;
      }

      /* וריאנט "float" (קו מפריד) */
      .arrival-row.float{
        display:flex;
        align-items:center;
        gap:10px;
        background:transparent;
        padding:6px 0 10px;
        position:relative;
      }
      .arrival-row.float:not(:last-child)::after{
        content:'';
        position:absolute;
        left:0;right:0;bottom:0;
        height:1px;
        background:linear-gradient(to right,rgba(255,255,255,0.05),rgba(255,255,255,0.25),rgba(255,255,255,0.05));
      }

      /* וריאנט "card" (כרטיסים) */
      .arrival-row.card{
        display:flex;
        align-items:center;
        gap:8px;
        padding:10px 12px;
        background:#ffffff;
        border-radius:12px;
        box-shadow:0 2px 6px rgba(0,0,0,.10);
      }
      .dark .arrival-row.card{
        background:#1f2937;
        box-shadow:0 2px 6px rgba(0,0,0,.35);
      }
      .arrival-row.card + .arrival-row.card{margin-top:8px}

      /* תאים */
      .arrival-row .shoulder-cell,
      .arrival-row .time-cell{
        flex:0 0 88px;
        min-width:88px;
        font-size:13px;
        font-weight:600;
        white-space:nowrap;
      }
      .arrival-row .shoulder-cell{
        text-align:right;
        color:#ffffff;
      }
      .arrival-row.card .shoulder-cell{color:#374151}
      .dark .arrival-row.card .shoulder-cell{color:#f1f5f9}

      .arrival-row .time-cell{
        text-align:left;
        font-family:monospace;
        color:#d1d5db;
      }
      .arrival-row.card .time-cell{color:#4b5563}
      .dark .arrival-row.card .time-cell{color:#e2e8f0}

      .arrival-row .comment-cell{
        flex:1;
        display:flex;
        justify-content:center;
        min-width:0;
      }

      /* כפתור הערה */
      .arrival-row .comment-btn{
        width:170px;
        max-width:170px;
        min-height:34px;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        gap:4px;
        border:none;
        border-radius:10px;
        background:#2563eb;
        color:#fff;
        font-weight:600;
        font-size:12px;
        line-height:1.1;
        cursor:pointer;
        padding:6px 12px;
        box-shadow:0 4px 10px -2px rgba(0,0,0,.35),0 0 0 1px rgba(255,255,255,0.06) inset;
        transition:.18s;
        position:relative;
        text-align:center;
      }
      .arrival-row .comment-btn:hover{
        background:#1d4ed8;
        transform:translateY(-2px);
        box-shadow:0 6px 14px -3px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,0.08) inset;
      }
      .arrival-row .comment-btn-empty{opacity:.88;font-style:italic}
      .arrival-row .comment-btn-empty:hover{opacity:1;font-style:normal}

      .arrival-row .comment-btn .comment-text{
        overflow:hidden;
        white-space:nowrap;
        max-width:120px;
        display:inline-block;
        direction:rtl;
        text-overflow:clip;
      }
      .arrival-row .comment-btn .comment-icon{flex:0 0 auto}

      @media (max-width:430px){
        .arrival-row .shoulder-cell,
        .arrival-row .time-cell{
          flex:0 0 80px;
          min-width:80px;
        }
        .arrival-row .comment-btn{
          width:150px;
          max-width:150px;
        }
        .arrival-row .comment-btn .comment-text{
          max-width:104px;
        }
      }
    `;
    document.head.appendChild(st);
  }

  function defaultTruncate(raw, max = 20){
    if (raw == null) return 'כתוב הגגגגגערה...';
    let str;
    if (Array.isArray(raw)){
      str = raw.filter(c=>c && c.trim()).join(' | ');
    } else {
      str = String(raw||'').trim();
    }
    if (!str) return 'כתוב העגגגגגרה...';
    const single = str.replace(/\s+/g,' ');
    return single.length > max ? single.slice(0, max-3) + '...' : single;
  }

  // options: {
  //   arrivals: [{shoulderNumber, finishTime, comment?}],
  //   stateRef: state,
  //   getComment(sn) => comment raw,
  //   formatTime(ms),
  //   truncate(raw, max),
  //   maxChars,
  //   variant: 'float' | 'card',
  //   showHeader: true/false,
  //   labels: { shoulder, comment, time },
  //   listId (default 'arrival-list'),
  //   onCommentClick(sn, buttonEl),
  // }
  window.ArrivalRows.render = function renderArrivalRows(opts){
    ensureStyles();
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
      onCommentClick
    } = opts;

    const headerHtml = (showHeader && arrivals.length) ? `
      <div class="arrival-header">
        <span class="h-cell">${labels.shoulder}</span>
        <span class="h-cell center">${labels.comment}</span>
        <span class="h-cell time">${labels.time}</span>
      </div>` : '';

    const rowsHtml = arrivals.map((a, idx) => {
      const sn = a.shoulderNumber;
      const raw = getComment ? getComment(sn) : undefined;
      const has = Array.isArray(raw) ? raw.some(c=>c && c.trim()) : !!(raw && String(raw).trim());
      const display = truncate(raw, maxChars);
      const timeText = a.finishTime != null ? formatTime(a.finishTime) : (a.comment || '');
      return `
        <div class="arrival-row ${variant}">
          <span class="shoulder-cell">${idx + 1}. ${sn}</span>
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
        <div id="${listId}">
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