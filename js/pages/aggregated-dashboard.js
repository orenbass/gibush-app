// aggregated-dashboard.js
// דשבורד חדש לקריאת קובץ מאוחד מהדרייב והצגת אגריגציה
// שימוש: AggregatedDashboard.init();
(function(){
  if (window.AggregatedDashboard) {
    // augment existing with refresh if missing
    if (!window.AggregatedDashboard.prototype.refreshCurrent) {
      window.AggregatedDashboard.prototype.refreshCurrent = function(){ if(!this.lastQuery) return this.renderDatePicker(); this._refreshFetch(); };
    }
    return;
  }

  class AggregatedDashboard {
    static init(opts={}) {
      const instance = new AggregatedDashboard(opts);
      instance.renderDatePicker();
      return instance;
    }

    constructor({ mountId='aggregated-dashboard-root' }={}) {
      this.mountId = mountId;
      this.state = {
        raw: null, // המערך המקורי של האובייקטים (מעריכים)
        groups: new Map(), // groupNumber -> { evaluators: Map(evaluatorName -> dataObject) }
        selected: { group: null, evaluator: null }
      };
      this.lastQuery = null; // שמירת חודש/שנה לריענון
      this.ensureMount();
    }

    ensureMount() {
      let el = document.getElementById(this.mountId);
      if (!el) {
        el = document.createElement('div');
        el.id = this.mountId;
        document.body.appendChild(el);
      }
      el.classList.add('aggregated-dashboard');
      this.root = el;
    }

    clearRoot() { this.root.innerHTML=''; }

    renderDatePicker() {
      this.clearRoot();
      this._injectStyles();
      const wrap = document.createElement('div');
      wrap.className='agg-date-picker';
      const today = new Date();
      const defYear = today.getFullYear();
      const defMonth = String(today.getMonth()+1).padStart(2,'0');
      wrap.innerHTML = `
        <div class="picker-card">
          <div class="picker-head">
            <h2 class="picker-title">דשבורד גיבוש מאוחד</h2>
            <p class="picker-sub">בחר חודש ושנה כדי לטעון את הנתונים המאוחדים</p>
          </div>
          <div class="picker-form">
            <label class="picker-field" aria-label="בחירת חודש">
              <span>חודש</span>
              <input type="number" id="aggMonth" min="1" max="12" value="${defMonth}" placeholder="MM" />
            </label>
            <label class="picker-field" aria-label="בחירת שנה">
              <span>שנה</span>
              <input type="number" id="aggYear" min="2023" max="2100" value="${defYear}" placeholder="YYYY" />
            </label>
            <button id="aggLoadBtn" class="picker-load-btn" title="טען דשבורד">🚀 טען דשבורד</button>
          </div>
          <div id="aggDateError" class="picker-error" role="alert" aria-live="polite"></div>
        </div>`;
      this.root.appendChild(wrap);
      const btn = wrap.querySelector('#aggLoadBtn');
      btn.addEventListener('click', async () => {
        const month = parseInt(wrap.querySelector('#aggMonth').value,10);
        const year = parseInt(wrap.querySelector('#aggYear').value,10);
        const errEl = wrap.querySelector('#aggDateError');
        errEl.textContent='';
        if (!month || !year) { errEl.textContent='נא להזין חודש ושנה'; return; }
        try {
          btn.disabled = true; btn.classList.add('is-loading'); btn.textContent='טוען...';
          const data = await window.GoogleDriveReader.fetchAggregated({ year, month });
          this._afterInitialFetch({ year, month }, data);
        } catch(e){
          console.error(e);
          errEl.textContent = e.message || 'שגיאה בטעינת הנתונים';
        } finally {
          btn.disabled = false; btn.classList.remove('is-loading'); btn.textContent='🚀 טען דשבורד';
        }
      });
    }

    ingest(rawArray) {
      this.state.raw = rawArray;
      this.state.groups.clear();
      rawArray.forEach(obj => {
        const d = obj.data || obj; // התאמה לגיבוי
        const group = d.groupNumber;
        if (!group) return;
        if (!this.state.groups.has(group)) {
          this.state.groups.set(group, { evaluators: new Map() });
        }
        this.state.groups.get(group).evaluators.set(d.evaluatorName || 'לא ידוע', d);
      });
      // Reset selections
      this.state.selected.group = null;
      this.state.selected.evaluator = null;
    }

    async _refreshFetch(){
      if(!this.lastQuery) return;
      const headerBtn = this.root.querySelector('#aggRefreshBtn');
      if (headerBtn) { headerBtn.disabled=true; headerBtn.textContent='מרענן...'; }
      try {
        const data = await window.GoogleDriveReader.fetchAggregated(this.lastQuery);
        this.ingest(data);
        // שמירה על הבחירות הקיימות אם עדיין קיימות
        this.renderMainLayout();
      } catch(e){ console.error(e); alert('שגיאת ריענון: '+(e.message||e)); }
      finally { if (headerBtn){ headerBtn.disabled=false; headerBtn.textContent='ריענון'; } }
    }

    async _afterInitialFetch(q, data){
      this.lastQuery = q; // שמור לחצן ריענון
      this.ingest(data);
      this.renderMainLayout();
    }

    renderMainLayout() {
      this.clearRoot();
      this._injectStyles();
      const header = document.createElement('div');
      header.className='agg-header shadow-sm';
      const groups = this._groupNumbers();
      const evaluatorsAll = this._allEvaluatorNames();
      header.innerHTML = `
        <div class="agg-header-row agg-header-row--filters">
          <div class="agg-header-left">
            <button id="aggExitBtn" class="agg-btn agg-btn-secondary" title="יציאה">🚪 יציאה</button>
            <button id="aggRefreshBtn" class="agg-btn agg-btn-primary" title="ריענון">🔄 ריענון</button>
            <div class="agg-subtitle agg-inline-stats">סה"כ מעריכים: <strong>${this.countEvaluators()}</strong> | סה"כ קבוצות: <strong>${this.state.groups.size}</strong></div>
          </div>
          <div class="agg-header-right agg-filters">
            <div class="agg-search-wrap">
              <input type="text" id="aggSearchInput" placeholder="חיפוש מספר / קבוצה" aria-label="חיפוש" />
              <button class="clear-btn" id="aggSearchClear" title="נקה" aria-label="נקה חיפוש">×</button>
            </div>
            <select id="aggGroupSelect" class="agg-filter-select" title="בחירת קבוצה">
              <option value="" ${this.state.selected.group? '':'selected'}>סיכום כללי</option>
              ${groups.map(g=>`<option value="${g}" ${this.state.selected.group==g?'selected':''}>קבוצה ${g}</option>`).join('')}
            </select>
            <select id="aggEvaluatorSelect" class="agg-filter-select" title="בחירת מעריך">
              <option value="" ${this.state.selected.evaluator? '':'selected'}>כל המעריכים</option>
              ${(this.state.selected.group? this._evaluatorNamesByGroup(this.state.selected.group): evaluatorsAll).map(n=>`<option value="${n}" ${this.state.selected.evaluator===n?'selected':''}>${n}</option>`).join('')}
            </select>
          </div>
        </div>`;
      const body = document.createElement('div');
      body.className='agg-body agg-body--single';
      body.innerHTML = `<section class="agg-content" id="aggContent" aria-live="polite"></section>`;
      this.root.appendChild(header);
      this.root.appendChild(body);
      header.querySelector('#aggExitBtn').addEventListener('click', () => this.renderDatePicker());
      header.querySelector('#aggRefreshBtn').addEventListener('click', () => this.refreshCurrent());
      header.querySelector('#aggGroupSelect').addEventListener('change', (e)=>{
        const v = e.target.value || null;
        this.state.selected.group = v;
        this.state.selected.evaluator = null; // reset evaluator on group change
        this.renderMainLayout();
      });
      header.querySelector('#aggEvaluatorSelect').addEventListener('change', (e)=>{
        const v = e.target.value || null;
        this.state.selected.evaluator = v;
        this.renderCurrentView();
      });
      const searchInput = header.querySelector('#aggSearchInput');
      const searchClear = header.querySelector('#aggSearchClear');
      if (searchInput) {
        if (this._lastSearch) { searchInput.value = this._lastSearch; setTimeout(()=> this._applySearch(this._lastSearch), 0); }
        searchInput.addEventListener('input', e=> this._applySearch(e.target.value));
        searchInput.addEventListener('keydown', e=> { if (e.key==='Escape'){ searchInput.value=''; this._applySearch(''); } });
      }
      if (searchClear) {
        searchClear.addEventListener('click', ()=> { if(!searchInput) return; searchInput.value=''; this._applySearch(''); searchInput.focus(); });
      }
      this.renderCurrentView();
    }

    renderCurrentView(){
      const content = this.root.querySelector('#aggContent');
      if (!content) return;
      
      if (!this.state.selected.group) {
        if (!this.state.selected.evaluator) {
          content.innerHTML = '<h3>סיכום כל המתמודדים</h3>';
          const allCandidates = this.aggregateAllCandidates();
          const { active, retired } = this.separateActiveAndRetired(allCandidates);
          content.appendChild(this.buildCandidatesTable(active));
          if (retired.length > 0) {
            content.appendChild(this.buildRetiredCandidatesSection(retired));
          }
        } else {
          content.innerHTML = `<h3>מעריך: ${this.state.selected.evaluator} (כל הקבוצות)</h3>`;
          const evaluatorCandidates = this.aggregateEvaluatorAcrossAll(this.state.selected.evaluator);
          const { active, retired } = this.separateActiveAndRetired(evaluatorCandidates);
          content.appendChild(this.buildCandidatesTable(active));
          if (retired.length > 0) {
            content.appendChild(this.buildRetiredCandidatesSection(retired));
          }
        }
      } else {
        const gData = this.state.groups.get(this.state.selected.group);
        if (!gData) { content.textContent='לא נמצאה קבוצה'; return; }
        if (!this.state.selected.evaluator) {
          content.innerHTML = `<h3>קבוצה ${this.state.selected.group} - ממוצעי כל המעריכים</h3>`;
          const groupCandidates = this.aggregateGroup(gData);
          const { active, retired } = this.separateActiveAndRetired(groupCandidates);
          content.appendChild(this.buildCandidatesTable(active));
          if (retired.length > 0) {
            content.appendChild(this.buildRetiredCandidatesSection(retired));
          }
        } else {
          const evalData = gData.evaluators.get(this.state.selected.evaluator);
          content.innerHTML = `<h3>קבוצה ${this.state.selected.group} - מעריך: ${this.state.selected.evaluator}</h3>`;
          if (evalData) {
            const list = (evalData.runners||[]).map(r=>{
              const sprintAvg = r.finalScores?.sprint ?? null;
              const crawlingAvg = r.finalScores?.crawling ?? null;
              const stretcherAvg = r.finalScores?.stretcher ?? null;
              const parts=[sprintAvg,crawlingAvg,stretcherAvg].filter(v=> typeof v==='number');
              const overallAvg= parts.length? +(parts.reduce((a,b)=>a+b,0)/parts.length).toFixed(2):null;
              return { 
                group: evalData.groupNumber, 
                shoulder: r.shoulderNumber, 
                sprintAvg, 
                crawlingAvg, 
                stretcherAvg, 
                overallAvg, 
                evalCount: 1, 
                hasComments: this._hasComments(evalData.groupNumber, r.shoulderNumber),
                status: r.status || 'active'
              };
            }).sort((a,b)=> (b.overallAvg ?? -1) - (a.shoulder - b.shoulder));
            
            const { active, retired } = this.separateActiveAndRetired(list);
            content.appendChild(this.buildCandidatesTable(active));
            if (retired.length > 0) {
              content.appendChild(this.buildRetiredCandidatesSection(retired));
            }
          } else {
            content.appendChild(document.createTextNode('לא נמצאו נתונים למעריך')); 
          }
        }
      }
    }

    separateActiveAndRetired(candidates) {
      const active = [];
      const retired = [];
      
      candidates.forEach(candidate => {
        // בדיקה אם המועמד פרש - נחפש בנתונים המקוריים
        const isRetired = this.isRunnerRetired(candidate.group, candidate.shoulder);
        
        if (isRetired) {
          retired.push(candidate);
        } else {
          active.push(candidate);
        }
      });
      
      return { active, retired };
    }

    isRunnerRetired(group, shoulder) {
      const gData = this.state.groups.get(group);
      if (!gData) return false;
      
      // בדיקה אם יש סטטוס פרישה בכל אחד מהמעריכים
      for (const evalData of gData.evaluators.values()) {
        if (evalData.crawlingDrills?.runnerStatuses?.[shoulder] === 'retired') {
          return true;
        }
        // בדיקה בנתוני הרץ עצמו
        const runner = (evalData.runners || []).find(r => String(r.shoulderNumber) === String(shoulder));
        if (runner && runner.status === 'retired') {
          return true;
        }
      }
      
      return false;
    }

    buildRetiredCandidatesSection(retiredCandidates) {
      const section = document.createElement('div');
      section.className = 'retired-candidates-section';
      
      section.innerHTML = `
        <h4 class="retired-title">מתמודדים לא פעילים</h4>
        <div class="retired-bubbles">
          ${retiredCandidates.map(r => `
            <button class="retired-bubble" data-group="${r.group}" data-shoulder="${r.shoulder}" title="מועמד ${r.shoulder} - קבוצה ${r.group}">
              ${r.shoulder}
            </button>
          `).join('')}
        </div>
      `;
      
      // הוספת פונקציונליות לחיצה על בועיות
      section.querySelectorAll('.retired-bubble').forEach(bubble => {
        bubble.addEventListener('click', () => this._openCandidateDetails(bubble.dataset.group, bubble.dataset.shoulder));
      });
      
      return section;
    }

    renderGroupLanding(groupNumber) {
      const gData = this.state.groups.get(groupNumber);
      const content = this.root.querySelector('#aggContent');
      content.innerHTML = `<h3>קבוצה ${groupNumber}</h3>`;
      const evaluatorTabs = document.createElement('div');
      evaluatorTabs.className='agg-evaluator-tabs';
      const evalNames = Array.from(gData.evaluators.keys());
      evaluatorTabs.innerHTML = `
        <button data-role="groupSummary" class="tab-btn ${!this.state.selected.evaluator? 'active':''}">סיכום קבוצה</button>
        ${evalNames.map(n=>`<button class="tab-btn ${this.state.selected.evaluator===n?'active':''}" data-evaluator="${n}">${n}</button>`).join('')}
      `;
      content.appendChild(evaluatorTabs);
      evaluatorTabs.querySelectorAll('button').forEach(btn=>{
        btn.addEventListener('click',()=>{
          if (btn.getAttribute('data-role')==='groupSummary') {
            this.state.selected.evaluator = null;
            this.renderGroupLanding(groupNumber);
          } else {
            this.state.selected.evaluator = btn.getAttribute('data-evaluator');
            this.renderGroupLanding(groupNumber);
          }
        });
      });

      if (!this.state.selected.evaluator) {
        this.renderGroupSummary(container, gData, groupNumber);
      } else {
        this.renderEvaluatorView(container, gData.evaluators.get(this.state.selected.evaluator));
      }
    }

    renderGroupSummary(container, gData, groupNumber) {
      const block = document.createElement('div');
      block.innerHTML = `<h4>ממוצעים בין כל המעריכים - קבוצה ${groupNumber}</h4>`;
      const aggregated = this.aggregateGroup(gData);
      block.appendChild(this.buildCandidatesTable(aggregated));
      container.appendChild(block);
    }

    aggregateGroup(gData) {
      const map = new Map();
      gData.evaluators.forEach(evalData => {
        (evalData.runners||[]).forEach(r => {
          const key = r.shoulderNumber;
            if (!map.has(key)) map.set(key,{ group: evalData.groupNumber, shoulder: r.shoulderNumber, sprint: [], crawling: [], stretcher: [] });
            const entry = map.get(key);
            if (r.finalScores) ['sprint','crawling','stretcher'].forEach(k=> { if (typeof r.finalScores[k]==='number') entry[k].push(r.finalScores[k]); });
        });
      });
      return Array.from(map.values()).map(c=> {
        const sprintAvg=this.avg(c.sprint), crawlingAvg=this.avg(c.crawling), stretcherAvg=this.avg(c.stretcher);
        const pts=[sprintAvg,crawlingAvg,stretcherAvg].filter(v=> typeof v==='number');
        const overallAvg = pts.length? +(pts.reduce((a,b)=>a+b,0)/pts.length).toFixed(2):null;
        return { group: c.group, shoulder: c.shoulder, sprintAvg, crawlingAvg, stretcherAvg, overallAvg, evalCount: Math.max(c.sprint.length,c.crawling.length,c.stretcher.length), hasComments: this._hasComments(c.group, c.shoulder) };
      }).sort((a,b)=> (b.overallAvg ?? -1) - (a.shoulder - b.shoulder));
    }

    renderEvaluatorView(container, evalData) {
      const block = document.createElement('div');
      block.innerHTML = `<h4>מעריך: ${evalData.evaluatorName}</h4>`;
      const simpleList = (evalData.runners||[]).map(r=>{
        const sprintAvg = r.finalScores?.sprint ?? null;
        const crawlingAvg = r.finalScores?.crawling ?? null;
        const stretcherAvg = r.finalScores?.stretcher ?? null;
        const parts=[sprintAvg,crawlingAvg,stretcherAvg].filter(v=> typeof v==='number');
        const overallAvg= parts.length? +(parts.reduce((a,b)=>a+b,0)/parts.length).toFixed(2):null;
        return ({
          group: evalData.groupNumber,
          shoulder: r.shoulderNumber,
          sprintAvg,
          crawlingAvg,
          stretcherAvg,
          overallAvg,
          evalCount: 1,
          hasComments: this._hasComments(evalData.groupNumber, r.shoulderNumber)
        });
      }).sort((a,b)=> (b.overallAvg ?? -1) - (a.shoulder - b.shoulder));
      block.appendChild(this.buildCandidatesTable(simpleList));
      container.appendChild(block);
    }

    _applySearch(q){
      this._lastSearch = q.trim();
      const content = this.root.querySelector('#aggContent');
      if (!content) return;
      const tables = content.querySelectorAll('tbody');
      tables.forEach(tb => {
        tb.querySelectorAll('tr').forEach(tr => {
          if (!this._lastSearch) { tr.classList.remove('faded'); tr.style.display=''; return; }
          const g = tr.getAttribute('data-group');
          const s = tr.getAttribute('data-shoulder');
            const show = (g && g.includes(this._lastSearch)) || (s && s.includes(this._lastSearch));
            tr.style.display = show?'' :'none';
        });
      });
    }

    _openCandidateDetails(group, shoulder){
      const details = this._collectCandidateDetails(group, shoulder);
      if (!details) { alert('לא נמצאו פרטים למועמד'); return; }
      this._showDetailsOverlay(details);
    }

    _collectCandidateDetails(group, shoulder){
      // Robust lookup for numeric/string keys
      const gData = this.state.groups.get(group) || this.state.groups.get(String(group)) || this.state.groups.get(parseInt(group));
      if (!gData) return null;
      const perEvaluator = [];
      gData.evaluators.forEach(evData => {
        const runner = (evData.runners||[]).find(r => String(r.shoulderNumber)===String(shoulder));
        if (runner) {
          perEvaluator.push({
            evaluator: evData.evaluatorName || 'לא ידוע',
            finalScores: runner.finalScores || {},
            comments: this._collectComments(evData, runner.shoulderNumber),
            heats: this._extractHeatTimes(evData, runner.shoulderNumber),
            crawl: this._extractCrawling(evData, runner.shoulderNumber),
            stretcher: this._extractStretcher(evData, runner.shoulderNumber)
          });
        }
      });
      if (!perEvaluator.length) return null;
      const avg = (key)=>{ const arr=perEvaluator.map(e=> e.finalScores?.[key]).filter(v=>typeof v==='number'); if(!arr.length) return null; return +(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2); };
      return { group, shoulder, perEvaluator, avgSprint: avg('sprint'), avgCrawl: avg('crawling'), avgStretcher: avg('stretcher') };
    }

    _collectComments(evData, shoulder){
      const out = [];
      const sn = String(shoulder);
      const add = (val)=>{
        if (val === null || val === undefined) return;
        if (Array.isArray(val)) { val.forEach(add); return; }
        if (typeof val === 'object') {
          if (typeof val.text === 'string') add(val.text);
          return;
        }
        if (typeof val === 'string') {
          const t = val.trim();
          // דילוג על 'לא סיים' גנרי ללא הקשר – נוסיף אותו בהמשך עם פרטי מקצה
          if (!t || t === '-' || t.toLowerCase() === 'na' || t === 'לא סיים') return;
          if (!out.includes(t)) out.push(t);
        }
      };
      // Legacy keyed structures
      if (evData.quickComments && evData.quickComments[sn]) add(evData.quickComments[sn]);
      if (evData.generalComments && evData.generalComments[sn]) add(evData.generalComments[sn]);
      if (evData.crawlingDrills?.comments && evData.crawlingDrills.comments[sn]) add(evData.crawlingDrills.comments[sn]);
      // Runner-level
      const runner = (evData.runners||[]).find(r => String(r.shoulderNumber)===sn);
      if (runner) {
        add(runner.quickComments);
        add(runner.generalComments);
        // ספרינטים זחילה ברמת הרץ
        (runner.crawlingSprints||[]).forEach((s,idx)=>{
          if (!s) return;
          const comment = (s.comment||'').trim();
            if (comment === 'לא סיים') {
              const heatNum = s.heatNumber ?? s.heatIndex ?? s.heat ?? (idx+1);
              const label = `זחילה מקצה ${heatNum} - לא סיים`;
              if (!out.includes(label)) out.push(label);
            } else if (comment) add(comment);
        });
        // ספרינטים ריצה ברמת הרץ
        (runner.sprintHeats||[]).forEach((h,idx)=>{
          if (!h) return;
          const comment = (h.comment||'').trim();
            if (comment === 'לא סיים') {
              const heatNum = h.heatNumber ?? h.heatIndex ?? h.heat ?? (idx+1);
              const label = `ספרינט מקצה ${heatNum} - לא סיים`;
              if (!out.includes(label)) out.push(label);
            } else if (comment) add(comment);
        });
      }
      // NEW: הוספת פריטי DNF עם הקשר מקצה וסוגו לחלון ההערות המאוחד
      try {
        // ספרינטים רגילים (מקור evaluator.heats)
        (evData.heats||[]).forEach((h,hIdx) => {
          const rec = (h.arrivals||[]).find(a => String(a.shoulderNumber)===sn);
          if (rec && (!rec.finishTime) && rec.comment === 'לא סיים') {
            const heatNum = h.heatNumber ?? h.heatIndex ?? h.heat ?? (hIdx+1);
            const label = `ספרינט מקצה ${heatNum} - לא סיים`;
            if (!out.includes(label)) out.push(label);
          }
        });
        // ספרינטים זחילה (מקור evaluator.crawlingDrills.sprints)
        (evData.crawlingDrills?.sprints||[]).forEach((s,sIdx) => {
          const rec = (s.arrivals||[]).find(a => String(a.shoulderNumber)===sn);
          if (rec && (!rec.finishTime) && rec.comment === 'לא סיים') {
            const heatNum = s.heatNumber ?? s.heatIndex ?? s.heat ?? (sIdx+1);
            const label = `זחילה מקצה ${heatNum} - לא סיים`;
            if (!out.includes(label)) out.push(label);
          }
        });
      } catch(e){ /* silent */ }
      return out;
    }

    _extractHeatTimes(evData, shoulder){
      const heats = evData.heats || evData?.data?.heats || [];
      return heats.map((h,i)=>{
        const arr = h.arrivals||[]; const rec = arr.find(a=> String(a.shoulderNumber)===String(shoulder));
        const heatNum = h.heatNumber ?? h.heatIndex ?? h.heat ?? (i+1);
        return { heat: heatNum, time: rec?rec.finishTime:null, comment: rec?rec.comment:null };
      }).filter(h=> h.time!==null || h.comment);
    }

    _extractCrawling(evData, shoulder){
      const sprints = evData.crawlingDrills?.sprints || [];
      return sprints.map((s,i)=> {
        const arr = s.arrivals||[]; const rec = arr.find(a=> String(a.shoulderNumber)===String(shoulder));
        const heatNum = s.heatNumber ?? s.heatIndex ?? s.heat ?? (i+1);
        return { sprint: heatNum, time: rec?rec.finishTime:null, comment: rec?rec.comment:null };
      }).filter(r=> r.time!==null || r.comment);
    }

    _extractStretcher(evData, shoulder){
      const heats = evData.sociometricStretcher?.heats || [];
      const picks = heats.map(h=> h.selections && h.selections[shoulder] ? { heat: h.heatNumber, role: h.selections[shoulder] } : null).filter(Boolean);
      return picks;
    }

    _showDetailsOverlay(data){
      document.getElementById('aggDetailsOverlay')?.remove();
      const wrap = document.createElement('div');
      wrap.id='aggDetailsOverlay';
      wrap.className='agg-overlay';
      const combinedComments = Array.from(new Set(data.perEvaluator.flatMap(e=> e.comments)));
      wrap.innerHTML = `
        <div class="agg-overlay-backdrop" data-close></div>
        <div class="agg-overlay-panel" role="dialog" aria-label="פרטי מועמד">
          <header class="panel-header">
            <h3>מועמד ${data.shoulder} (קבוצה ${data.group})</h3>
            <button class="close-btn" data-close aria-label="סגירת חלון">✖</button>
          </header>
          <section class="panel-section panel-summary">
            <div class="summary-cards">
              <div class="summary-card"><span>ספרינט</span><strong>${data.avgSprint ?? '-'}</strong></div>
              <div class="summary-card"><span>זחילה</span><strong>${data.avgCrawl ?? '-'}</strong></div>
              <div class="summary-card"><span>אלונקה</span><strong>${data.avgStretcher ?? '-'}</strong></div>
              <div class="summary-card total"><span>כולל</span><strong>${(function(){const parts=[data.avgSprint,data.avgCrawl,data.avgStretcher].filter(v=>typeof v==='number');return parts.length? (parts.reduce((a,b)=>a+b,0)/parts.length).toFixed(2):'-';})()}</strong></div>
            </div>
            ${combinedComments.length?`<div class="combined-comments"><h4>הערות מאוחדות</h4><ul>${combinedComments.map(c=>`<li>${this._escape(c)}</li>`).join('')}</ul></div>`:''}
          </section>
          <section class="panel-section">
            <h4>פירוט לפי מעריך</h4>
            <div class="evaluator-accordion">
              ${data.perEvaluator.map((e,i)=>`
                <details ${i===0?'open':''}>
                  <summary><span class="eval-name">${e.evaluator}</span>
                    <span class="eval-scores">
                      <span class="pill sprint" title="ספרינט">${e.finalScores?.sprint ?? '-'}</span>
                      <span class="pill crawl" title="זחילה">${e.finalScores?.crawling ?? '-'}</span>
                      <span class="pill stretcher" title="אלונקה">${e.finalScores?.stretcher ?? '-'}</span>
                    </span>
                  </summary>
                  <div class="eval-body">
                    ${e.comments.length?`<div class="comments-block"><h5>הערות</h5><ul>${e.comments.map(c=>`<li>${this._escape(c)}</li>`).join('')}</ul></div>`:''}
                    ${e.heats.length?`<div class="heats-block"><h5>ספרינטים</h5>${this._buildMiniList(e.heats,'heat')}</div>`:''}
                    ${e.crawl.length?`<div class="crawl-block"><h5>זחילות</h5>${this._buildMiniList(e.crawl,'sprint')}</div>`:''}
                    ${e.stretcher.length?`<div class="stretcher-block"><h5>אלונקה סוציו'</h5><ul class="tag-list">${e.stretcher.map(s=>`<li class="tag role-${s.role}">H${s.heat}: ${s.role}</li>`).join('')}</ul></div>`:''}
                  </div>
                </details>`).join('')}
            </div>
          </section>
        </div>`;
      document.body.appendChild(wrap);
      wrap.querySelectorAll('[data-close]').forEach(el=> el.addEventListener('click',()=> wrap.remove()));
      wrap.addEventListener('keydown', (e)=> { if(e.key==='Escape') wrap.remove(); });
      setTimeout(()=> wrap.classList.add('visible'), 16);
    }

    _buildMiniList(arr, label){
      return `<ul class="mini-time-list">${arr.map(a=> `<li><span class="mini-label">${label[0].toUpperCase()}${a[label]}</span>${a.time!==null? this._formatMs(a.time):''}${a.comment?`<em>${this._escape(a.comment)}</em>`:''}</li>`).join('')}</ul>`;
    }

    _formatMs(ms){ if(!ms && ms!==0) return ''; const s=(ms/1000); return `<span class="time-val">${s.toFixed(2)}s</span>`; }

    _escape(t){ return String(t).replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m])); }

    _hasComments(group, shoulder){
      const g = this.state.groups.get(group);
      if (!g) return false;
      const sn = String(shoulder);
      for (const ev of g.evaluators.values()) {
        // Use the unified collector (already filters ריקים / רווחים)
        const arr = this._collectComments(ev, sn);
        if (arr.length) return true;
      }
      return false;
    }

    buildCandidatesTable(list, opts={}) {
      const clickable = opts.clickable !== false; // default true
      const hasOverall = list.some(r=> typeof r.overallAvg === 'number' || r.overallAvg === null);
      
      // מיון לפי ציון כללי ומיספור מיקומים
      const sortedList = [...list].sort((a,b)=> (b.overallAvg ?? -1) - (a.overallAvg ?? -1) || parseInt(a.group)-parseInt(b.group) || a.shoulder-b.shoulder);
      const listWithPositions = sortedList.map((item, index) => ({
        ...item,
        position: index + 1
      }));

      const table = document.createElement('div');
      table.className='agg-table-wrapper';
      table.innerHTML = `
        <div class="agg-table-scroll">
          <table class="agg-table">
            <thead>
              <tr>
                <th title="מיקום כללי">מיקום</th>
                <th>קבוצה</th>
                <th>מספר</th>
                <th title="ממוצע ציון ספרינט">ספרינט</th>
                <th title="ממוצע ציון זחילה">זחילה</th>
                <th title="ממוצע ציון אלונקה">אלונקה</th>
                ${hasOverall?'<th title="ממוצע כולל (3 פרמטרים)">כולל</th>':''}
                <th title="מספר מעריכים תורמים"># מעריכים</th>
              </tr>
            </thead>
            <tbody>
              ${listWithPositions.map(r=>`
                <tr ${clickable?`class=\"agg-row\" data-group=\"${r.group}\" data-shoulder=\"${r.shoulder}\" tabindex=\"0\" aria-label=\"מועמד ${r.shoulder} בקבוצה ${r.group}\"`:''}>
                  <td class="position-cell ${r.position <= 3 ? `position-${r.position}` : ''}">${r.position}</td>
                  <td>${r.group}</td>
                  <td><span class="sn">${r.shoulder}</span>${r.hasComments?'<span class="comment-indicator" title="יש הערות" aria-label="יש הערות"></span>':''}</td>
                  <td class="score sprint">${r.sprintAvg ?? ''}</td>
                  <td class="score crawl">${r.crawlingAvg ?? ''}</td>
                  <td class="score stretcher">${r.stretcherAvg ?? ''}</td>
                  ${hasOverall?`<td class="score overall">${r.overallAvg ?? ''}</td>`:''}
                  <td>${r.evalCount}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
      if (clickable) {
        table.querySelectorAll('.agg-row').forEach(row => {
          row.addEventListener('click', ()=> this._openCandidateDetails(row.dataset.group, row.dataset.shoulder));
          row.addEventListener('keydown', (e)=> { if(e.key==='Enter'||e.key===' ') { e.preventDefault(); this._openCandidateDetails(row.dataset.group, row.dataset.shoulder); }});
        });
      }
      return table;
    }

    _injectStyles(){
      if (document.getElementById('aggDashboardStyles')) return;
      const css = `
      .aggregated-dashboard{display:flex;flex-direction:column;gap:1rem;font-family:system-ui,'Segoe UI',Arial,sans-serif;}
      .agg-header{background:var(--agg-head-bg,#ffffffcc);backdrop-filter:blur(6px);border:1px solid #e2e8f0;border-radius:1rem;padding:0.75rem 1rem;}
      .dark .agg-header{background:#1e293bcc;border-color:#334155;}
      .agg-header-row{display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap;}
      .agg-title{margin:0;font-size:1.25rem;font-weight:700;color:#1d4ed8;}
      .dark .agg-title{color:#60a5fa;}
      .agg-subtitle{font-size:.75rem;color:#475569;margin-top:.15rem;}
      .dark .agg-subtitle{color:#94a3b8;}
      .agg-legend{display:flex;gap:.5rem;font-size:.65rem;color:#475569;flex-wrap:wrap;}
      .dark .agg-legend{color:#94a3b8;}
      .legend-dot{width:.85rem;height:.85rem;border-radius:50%;display:inline-block;margin-left:4px;vertical-align:middle;}
      .legend-dot.sprint{background:#fb923c;}
      .legend-dot.crawl{background:#34d399;}
      .legend-dot.stretcher{background:#818cf8;}
      .agg-btn{border:none;border-radius:.65rem;padding:.55rem .85rem;font-weight:600;font-size:.75rem;display:inline-flex;align-items:center;gap:.4rem;cursor:pointer;transition:.18s;background:#e2e8f0;color:#1e293b;}
      .agg-btn-primary{background:#2563eb;color:#fff;}
      .agg-btn-primary:hover{background:#1d4ed8;}
      .agg-btn-secondary:hover{background:#cbd5e1;}
      .dark .agg-btn-secondary{background:#334155;color:#f1f5f9;}
      .dark .agg-btn-secondary:hover{background:#475569;}
      .agg-tools-row{display:flex;justify-content:space-between;align-items:center;margin-top:.4rem;flex-wrap:wrap;gap:.75rem;}
      .agg-search-wrap{position:relative;}
      .agg-search-wrap input{padding:.5rem .9rem;border:1px solid #cbd5e1;border-radius:2rem;font-size:.8rem;min-width:200px;background:#fff;}
      .dark .agg-search-wrap input{background:#1e293b;border-color:#334155;color:#f1f5f9;}
      .agg-search-wrap .clear-btn{position:absolute;left:.4rem;top:50%;transform:translateY(-50%);background:transparent;border:none;cursor:pointer;font-size:.7rem;color:#64748b;}
      .agg-body{display:grid;grid-template-columns:200px 1fr;gap:1rem;align-items:start;}
      @media (max-width:900px){.agg-body{grid-template-columns:1fr;} .agg-sidebar{order:2;} }
      .agg-sidebar{padding:.75rem;display:flex;flex-direction:column;gap:.5rem;}
      .agg-sidebar button{background:#f1f5f9;border:none;border-radius:.55rem;padding:.45rem .65rem;font-size:.7rem;font-weight:600;cursor:pointer;text-align:center;transition:.18s;}
      .agg-sidebar button:hover{background:#e2e8f0;}
      .agg-sidebar ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.35rem;}
      .agg-sidebar li{background:#fff;border:1px solid #e2e8f0;border-radius:.55rem;padding:.4rem .55rem;font-size:.7rem;cursor:pointer;transition:.18s;display:flex;justify-content:space-between;align-items:center;}
      .agg-sidebar li.active{background:#2563eb;color:#fff;border-color:#1d4ed8;box-shadow:0 2px 4px -1px rgba(0,0,0,.15);}
      .agg-sidebar li:hover:not(.active){background:#eff6ff;}
      .dark .agg-sidebar li{background:#1e293b;border-color:#334155;color:#cbd5e1;}
      .dark .agg-sidebar li.active{background:#1d4ed8;color:#fff;}
      .agg-content{background:#fff;border:1px solid #e2e8f0;border-radius:1rem;padding:1rem;min-height:300px;box-shadow:0 1px 2px rgba(0,0,0,.06);} 
      .dark .agg-content{background:#0f172a;border-color:#1e293b;}
      .agg-table-wrapper{width:100%;}
      .agg-table-scroll{overflow:auto;max-height:62vh;-webkit-overflow-scrolling:touch;}
      .agg-table{width:100%;border-collapse:separate;border-spacing:0;font-size:.7rem;line-height:1.2;}
      .agg-table th{position:sticky;top:0;background:#f1f5f9;font-weight:700;font-size:.65rem;text-align:center;padding:.45rem;border-bottom:1px solid #e2e8f0;z-index:2;}
      .dark .agg-table th{background:#1e293b;border-color:#334155;color:#e2e8f0;}
      .agg-table td{padding:.4rem .5rem;text-align:center;border-bottom:1px solid #f1f5f9;font-weight:500;}
      .dark .agg-table td{border-color:#1e293b;}
      .agg-table tr:last-child td{border-bottom:none;}
      .agg-table tr.agg-row{cursor:pointer;transition:background .15s,transform .15s;}
      .agg-table tr.agg-row:hover{background:#eff6ff;}
      .dark .agg-table tr.agg-row:hover{background:#1e3a8a44;}
      .agg-table .score{font-weight:600;border-radius:.4rem;}
      .agg-table .score.sprint{color:#ea580c;}
      .agg-table .score.crawl{color:#059669;}
      .agg-table .score.stretcher{color:#6366f1;}
      .agg-table .score.overall{color:#0d9488;font-weight:700;}
      .dark .agg-table .score.overall{color:#34d399;}
      
      /* Position column styles */
      .position-cell{font-weight:700;font-size:.75rem;}
      .position-1{background:linear-gradient(135deg,#ffd700,#ffed4e);color:#92400e;box-shadow:0 0 8px rgba(255,215,0,.4);}
      .position-2{background:linear-gradient(135deg,#c0c0c0,#e5e7eb);color:#374151;box-shadow:0 0 6px rgba(192,192,192,.3);}
      .position-3{background:linear-gradient(135deg,#cd7f32,#f59e0b);color:#78350f;box-shadow:0 0 6px rgba(205,127,50,.3);}
      .dark .position-1{background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#451a03;}
      .dark .position-2{background:linear-gradient(135deg,#9ca3af,#6b7280);color:#111827;}
      .dark .position-3{background:linear-gradient(135deg,#d97706,#b45309);color:#1c1917;}
      
      /* Retired candidates section */
      .retired-candidates-section{margin-top:2rem;border:1px solid #fecaca;border-radius:1rem;background:#fef2f2;overflow:hidden;padding:1rem;}
      .dark .retired-candidates-section{border-color:#7f1d1d;background:#1f1917;}
      .retired-title{margin:0;font-size:.9rem;font-weight:700;color:#991b1b;display:flex;align-items:center;gap:.5rem;}
      .dark .retired-title{color:#fca5a5;}
      .retired-title::before{content:'⚠️';font-size:1rem;}
      .retired-bubbles{display:flex;flex-wrap:wrap;gap:.5rem;}
      .retired-bubble{background:#ef4444;color:#fff;border:none;border-radius:50%;padding:.5rem .75rem;font-size:.8rem;font-weight:700;cursor:pointer;transition:.2s;}
      .retired-bubble:hover{background:#dc2626;}
      .dark .retired-bubble{background:#7f1d1d;}
      .dark .retired-bubble:hover{background:#991b1b;}
      /* New comment indicator (replaces emoji square issue) */
      .comment-indicator{display:inline-block;vertical-align:middle;margin-inline-start:.35rem;width:.65rem;height:.65rem;border-radius:50%;background:#f59e0b;box-shadow:0 0 0 1px #fff,0 0 0 2px #fbbf24aa;position:relative;}
      .dark .comment-indicator{box-shadow:0 0 0 1px #0f172a,0 0 0 2px #b45309aa;}
      .comment-indicator:after{content:'';position:absolute;inset:0;border-radius:50%;animation:aggPulse 2.2s ease-in-out infinite;box-shadow:0 0 0 0 rgba(245,158,11,.5);}
      @keyframes aggPulse{0%{box-shadow:0 0 0 0 rgba(245,158,11,.6);}70%{box-shadow:0 0 0 6px rgba(245,158,11,0);}100%{box-shadow:0 0 0 0 rgba(245,158,11,0);}}
      .comment-indicator{margin-inline-start:.35rem;font-size:.65rem;color:#475569;opacity:.75;}
      .comment-indicator:hover{opacity:1;}
      .dark .comment-indicator{color:#94a3b8;}
      /* Date picker redesign */
      .agg-date-picker{display:flex;justify-content:center;align-items:flex-start;padding:2rem 1rem;}
      .agg-date-picker .picker-card{width:clamp(300px,520px,90vw);background:linear-gradient(135deg,#ffffff 0%,#f0f7ff 60%,#e8f0ff 100%);border:1px solid #dbe6f4;border-radius:1.4rem;padding:1.4rem 1.6rem;box-shadow:0 8px 28px -6px rgba(0,64,128,.18),0 2px 6px rgba(0,0,0,.08);position:relative;overflow:hidden;}
      .dark .agg-date-picker .picker-card{background:linear-gradient(135deg,#0f172a 0%,#1e293b 55%,#1e3a5f 100%);border-color:#1e3a5f;}
      .picker-head:after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 85% 15%,rgba(56,189,248,.35),transparent 55%);} 
      .dark .picker-head:after{background:radial-gradient(circle at 85% 15%,rgba(96,165,250,.35),transparent 55%);} 
      .picker-title{margin:0;font-size:1.55rem;font-weight:800;letter-spacing:-.5px;background:linear-gradient(90deg,#1d4ed8,#0d9488);-webkit-background-clip:text;color:transparent;}
      .dark .picker-title{background:linear-gradient(90deg,#60a5fa,#34d399);-webkit-background-clip:text;}
      .picker-sub{margin:.35rem 0 1.2rem;font-size:.85rem;color:#475569;line-height:1.3;font-weight:500;}
      .dark .picker-sub{color:#94a3b8;}
      .picker-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:1rem;margin-bottom:1.1rem;}
      .picker-field{display:flex;flex-direction:column;gap:.35rem;font-size:.7rem;font-weight:600;color:#334155;}
      .dark .picker-field{color:#cbd5e1;}
      .picker-field input{background:#fff;border:1px solid #cbd5e1;border-radius:.9rem;padding:.65rem .75rem;font-size:.9rem;font-weight:600;text-align:center;box-shadow:0 1px 2px rgba(0,0,0,.04);transition:.18s;}
      .picker-field input:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 3px #2563eb33;}
      .dark .picker-field input{background:#0f172a;border-color:#334155;color:#e2e8f0;}
      .dark .picker-field input:focus{border-color:#1d4ed8;box-shadow:0 0 0 3px #1d4ed833;}
      .picker-load-btn{grid-column:1/-1;display:inline-flex;align-items:center;justify-content:center;gap:.5rem;font-weight:700;font-size:.9rem;padding:.85rem .95rem;border:none;border-radius:1rem;background:linear-gradient(90deg,#2563eb,#1d4ed8);color:#fff;cursor:pointer;box-shadow:0 6px 18px -5px rgba(37,99,235,.45),0 2px 4px rgba(0,0,0,.12);position:relative;overflow:hidden;transition:.25s;}
      .picker-load-btn:hover{transform:translateY(-2px);box-shadow:0 10px 26px -6px rgba(37,99,235,.5),0 4px 10px rgba(0,0,0,.15);} 
      .picker-load-btn.is-loading{opacity:.7;cursor:wait;}
      .dark .picker-load-btn{background:linear-gradient(90deg,#1d4ed8,#1e3a8a);} 
      .picker-hints{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:.25rem;}
      .hint-chip{background:#eff6ff;color:#1d4ed8;padding:.4rem .7rem;border-radius:2rem;font-size:.62rem;font-weight:600;letter-spacing:.5px;box-shadow:0 1px 2px rgba(0,0,0,.05);} 
      .dark .hint-chip{background:#1e3a8a;color:#bfdbfe;}
      .picker-error{min-height:18px;font-size:.7rem;color:#dc2626;font-weight:600;margin-top:.35rem;}
      /* Summary button styling */
      .agg-group-summary-btn{background:#f1f5f9;border:none;border-radius:.8rem;padding:.55rem .75rem;font-size:.68rem;font-weight:700;cursor:pointer;letter-spacing:.5px;display:inline-flex;align-items:center;justify-content:center;gap:.4rem;box-shadow:0 1px 2px rgba(0,0,0,.08);transition:.18s;} 
      .agg-group-summary-btn:hover{background:#e2e8f0;} 
      .agg-group-summary-btn:focus{outline:2px solid #2563eb;outline-offset:2px;} 
      .dark .agg-group-summary-btn{background:#1e293b;color:#e2e8f0;box-shadow:0 1px 2px rgba(0,0,0,.4);} 
      .dark .agg-group-summary-btn:hover{background:#334155;}
      /* Combined comments block */
      .combined-comments{margin-top:.9rem;background:#f8fafc;border:1px solid #e2e8f0;padding:.6rem .75rem;border-radius:.8rem;}
      .dark .combined-comments{background:#1e293b;border-color:#334155;}
      .combined-comments h4{margin:.1rem 0 .45rem;font-size:.7rem;color:#334155;}
      .dark .combined-comments h4{color:#cbd5e1;}
      .combined-comments ul{list-style:disc inside;margin:0;padding:0;font-size:.62rem;display:flex;flex-direction:column;gap:.25rem;}
      /* Filters */
      .agg-header-row--filters{align-items:flex-start;}
      .agg-filters{display:flex;gap:.5rem;flex-wrap:wrap;}
      .agg-filter-select{appearance:none;background:#fff url('data:image/svg+xml;utf8,<svg fill="%2364748b" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.5 7l4.5 5 4.5-5H5.5z"/></svg>') no-repeat left .55rem center/12px 12px;border:1px solid #cbd5e1;border-radius:.7rem;padding:.45rem 1.8rem .45rem .9rem;font-size:.7rem;font-weight:600;color:#334155;min-width:130px;cursor:pointer;}
      .agg-filter-select:focus{outline:2px solid #2563eb;outline-offset:2px;}
      .dark .agg-filter-select{background:#1e293b url('data:image/svg+xml;utf8,<svg fill="%2394a3b8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.5 7l4.5 5 4.5-5H5.5z"/></svg>') no-repeat left .55rem center/12px 12px;border-color:#334155;color:#e2e8f0;}
      .agg-body--single{display:block;}
      /* override old grid unused sidebar */
      .agg-body--single .agg-content{margin-top:.25rem;}
      /* Overlay styles added */
      .agg-overlay{position:fixed;inset:0;display:flex;align-items:flex-start;justify-content:center;padding:2rem 1rem;background:rgba(0,0,0,.45);backdrop-filter:blur(4px);opacity:0;z-index:1000;transition:opacity .25s;}
      .agg-overlay.visible{opacity:1;}
      .agg-overlay-panel{background:#fff;color:#1e293b;max-width:860px;width:100%;max-height:90vh;overflow:auto;border-radius:1rem;padding:1rem 1.25rem;box-shadow:0 15px 50px -10px rgba(0,0,0,.4),0 0 0 1px #e2e8f0;}
      .dark .agg-overlay-panel{background:#0f172a;color:#e2e8f0;box-shadow:0 15px 50px -10px #000,0 0 0 1px #334155;}
      .panel-header{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-bottom:.75rem;}
      .panel-header h3{margin:0;font-size:1rem;font-weight:800;color:#1d4ed8;}
      .dark .panel-header h3{color:#60a5fa;}
      .close-btn{background:#ef4444;border:none;color:#fff;font-weight:700;border-radius:.55rem;padding:.35rem .6rem;cursor:pointer;font-size:.7rem;line-height:1;}
      .close-btn:hover{background:#dc2626;}
      .panel-section{margin-bottom:1rem;}
      .summary-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:.55rem;margin:.65rem 0 0;}
      .summary-card{background:#f1f5f9;padding:.55rem .5rem;border-radius:.75rem;text-align:center;font-size:.7rem;font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.06);} 
      .summary-card span{display:block;font-size:.55rem;font-weight:600;color:#64748b;margin-bottom:.15rem;}
      .summary-card.total{background:#0d9488;color:#fff;}
      .dark .summary-card{background:#1e293b;color:#e2e8f0;}
      .dark .summary-card span{color:#94a3b8;}
      .combined-comments{margin-top:.75rem;background:#f8fafc;border:1px solid #e2e8f0;padding:.55rem .7rem;border-radius:.7rem;}
      .dark .combined-comments{background:#1e293b;border-color:#334155;}
      .combined-comments h4{margin:.1rem 0 .4rem;font-size:.65rem;}
      .combined-comments ul{list-style:disc inside;margin:0;padding:0;display:flex;flex-direction:column;gap:.25rem;font-size:.58rem;}
      .evaluator-accordion details{border:1px solid #e2e8f0;border-radius:.65rem;margin-bottom:.55rem;background:#fff;overflow:hidden;}
      .dark .evaluator-accordion details{background:#1e293b;border-color:#334155;}
      .evaluator-accordion summary{cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:.45rem .65rem;font-size:.62rem;font-weight:700;list-style:none;}
      .evaluator-accordion summary::-webkit-details-marker{display:none;}
      .eval-scores .pill{display:inline-block;min-width:32px;text-align:center;border-radius:1rem;padding:.18rem .4rem;font-size:.5rem;font-weight:700;margin-inline-start:.25rem;background:#e2e8f0;}
      .pill.sprint{background:#fed7aa;color:#9a3412;}
      .pill.crawl{background:#bbf7d0;color:#065f46;}
      .pill.stretcher{background:#c7d2fe;color:#3730a3;}
      .dark .eval-scores .pill{background:#334155;color:#e2e8f0;}
      .eval-body{padding:.45rem .75rem .65rem;font-size:.6rem;display:flex;flex-direction:column;gap:.6rem;}
      .comments-block ul{list-style:disc inside;margin:0;padding:0;display:flex;flex-direction:column;gap:.25rem;font-size:.58rem;}
      .mini-time-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.35rem;font-size:.55rem;}
      .mini-time-list li{display:flex;gap:.4rem;align-items:center;flex-wrap:wrap;}
      .mini-label{background:#e2e8f0;border-radius:.45rem;padding:.1rem .45rem;font-size:.5rem;font-weight:700;color:#334155;}
      .dark .mini-label{background:#334155;color:#e2e8f0;}
      .time-val{font-weight:700;color:#1d4ed8;}
      .dark .time-val{color:#60a5fa;}
      .tag-list{list-style:none;margin:0;padding:0;display:flex;gap:.35rem;flex-wrap:wrap;}
      .tag{background:#e2e8f0;border-radius:.6rem;padding:.25rem .5rem;font-size:.55rem;font-weight:600;}
      .dark .tag{background:#334155;color:#e2e8f0;}
      .role-leader{background:#fcd34d;color:#92400e;}
      .role-carrier{background:#a7f3d0;color:#065f46;}
      `;
      const style = document.createElement('style');
      style.id='aggDashboardStyles';
      style.textContent = css;
      document.head.appendChild(style);
    }

    countEvaluators() {
      let count=0; 
      this.state.groups.forEach(g=> count += g.evaluators.size); 
      return count;
    }

    refreshCurrent() {
      if(!this.lastQuery) return this.renderDatePicker();
      this._refreshFetch();
    }

    avg(arr){ 
      if(!arr.length) return null; 
      const v=(arr.reduce((a,b)=>a+b,0)/arr.length); 
      return +v.toFixed(2); 
    }

    _groupNumbers(){ 
      return Array.from(this.state.groups.keys()).sort((a,b)=>parseInt(a)-parseInt(b)); 
    }
    
    _allEvaluatorNames(){ 
      const set = new Set(); 
      this.state.groups.forEach(g=> g.evaluators.forEach((_,name)=> set.add(name))); 
      return Array.from(set).sort(); 
    }
    
    _evaluatorNamesByGroup(g){ 
      const gd=this.state.groups.get(g); 
      if(!gd) return []; 
      return Array.from(gd.evaluators.keys()).sort(); 
    }

    aggregateAllCandidates() {
      const map = new Map();
      this.state.groups.forEach((gData, groupNumber) => {
        gData.evaluators.forEach(evalData => {
          (evalData.runners||[]).forEach(r => {
            const key = groupNumber+'-'+r.shoulderNumber;
            if (!map.has(key)) map.set(key,{ group: groupNumber, shoulder: r.shoulderNumber, sprint: [], crawling: [], stretcher: [] });
            const entry = map.get(key);
            if (r.finalScores) {
              ['sprint','crawling','stretcher'].forEach(k=> { if (typeof r.finalScores[k]==='number') entry[k].push(r.finalScores[k]); });
            }
          });
        });
      });
      return Array.from(map.values()).map(c=> {
        const sprintAvg = this.avg(c.sprint);
        const crawlingAvg = this.avg(c.crawling);
        const stretcherAvg = this.avg(c.stretcher);
        const parts = [sprintAvg, crawlingAvg, stretcherAvg].filter(v=> typeof v==='number');
        const overallAvg = parts.length? +(parts.reduce((a,b)=>a+b,0)/parts.length).toFixed(2) : null;
        return {
          group: c.group,
          shoulder: c.shoulder,
          sprintAvg,
          crawlingAvg,
          stretcherAvg,
          overallAvg,
          evalCount: Math.max(c.sprint.length, c.crawling.length, c.stretcher.length),
          hasComments: this._hasComments(c.group, c.shoulder)
        };
      }).sort((a,b)=> (b.overallAvg ?? -1) - (a.overallAvg ?? -1) || parseInt(a.group)-parseInt(b.group) || a.shoulder-b.shoulder);
    }

    aggregateEvaluatorAcrossAll(name){
      const rows=[];
      this.state.groups.forEach((gData, groupNumber)=>{
        gData.evaluators.forEach((evData, evName)=>{
          if (evName===name){
            (evData.runners||[]).forEach(r=>{
              const sprintAvg = r.finalScores?.sprint ?? null;
              const crawlingAvg = r.finalScores?.crawling ?? null;
              const stretcherAvg = r.finalScores?.stretcher ?? null;
              const parts=[sprintAvg,crawlingAvg,stretcherAvg].filter(v=> typeof v==='number');
              const overallAvg= parts.length? +(parts.reduce((a,b)=>a+b,0)/parts.length).toFixed(2):null;
              rows.push({ 
                group: groupNumber, 
                shoulder: r.shoulderNumber, 
                sprintAvg, 
                crawlingAvg, 
                stretcherAvg, 
                overallAvg, 
                evalCount:1, 
                hasComments: this._hasComments(groupNumber, r.shoulderNumber) 
              });
            });
          }
        });
      });
      return rows.sort((a,b)=> (b.overallAvg ?? -1) - (a.overallAvg ?? -1) || parseInt(a.group)-parseInt(b.group) || a.shoulder - b.shoulder);
    }

    aggregateGroup(gData) {
      const map = new Map();
      gData.evaluators.forEach(evalData => {
        (evalData.runners||[]).forEach(r => {
          const key = r.shoulderNumber;
          if (!map.has(key)) map.set(key,{ group: evalData.groupNumber, shoulder: r.shoulderNumber, sprint: [], crawling: [], stretcher: [] });
          const entry = map.get(key);
          if (r.finalScores) ['sprint','crawling','stretcher'].forEach(k=> { if (typeof r.finalScores[k]==='number') entry[k].push(r.finalScores[k]); });
        });
      });
      return Array.from(map.values()).map(c=> {
        const sprintAvg=this.avg(c.sprint), crawlingAvg=this.avg(c.crawling), stretcherAvg=this.avg(c.stretcher);
        const pts=[sprintAvg,crawlingAvg,stretcherAvg].filter(v=> typeof v==='number');
        const overallAvg = pts.length? +(pts.reduce((a,b)=>a+b,0)/pts.length).toFixed(2):null;
        return { group: c.group, shoulder: c.shoulder, sprintAvg, crawlingAvg, stretcherAvg, overallAvg, evalCount: Math.max(c.sprint.length,c.crawling.length,c.stretcher.length), hasComments: this._hasComments(c.group, c.shoulder) };
      }).sort((a,b)=> (b.overallAvg ?? -1) - (a.shoulder - b.shoulder));
    }
  }

  // Wrapper page renderer for main app integration
  window.Pages = window.Pages || {};
  window.Pages.renderAggregatedDashboardPage = function(){
    const content = document.getElementById('content');
    if (!content) return;
    content.innerHTML = '<div id="aggregated-dashboard-root"></div>';
    // if instance exists reuse? create fresh each time
    window.__aggDashInstance = AggregatedDashboard.init({ mountId: 'aggregated-dashboard-root' });
  };

  window.AggregatedDashboard = AggregatedDashboard;
})();