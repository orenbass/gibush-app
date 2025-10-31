// stats-dashboard.js
// דשבורד סטטיסטיקות עם ויזואליזציות מתקדמות
// מופרד מהדשבורד המאוחד כדי לא להכביד על הקובץ הראשי
(function(){
    if (window.StatsDashboard) return;
  
    class StatsDashboard {
      constructor(parentDashboard) {
        this.parent = parentDashboard; // הפניה לדשבורד המאוחד
      }
  
      /**
       * פתיחת חלון דשבורד הסטטיסטיקות
       */
      show() {
        // הכנת הנתונים
        const allCandidates = this.parent.aggregateAllCandidates();
        const stats = this.calculateStatistics(allCandidates);
        
        // יצירת חלון צף
        const overlay = document.createElement('div');
        overlay.id = 'statsOverlay';
        overlay.className = 'stats-overlay';
        overlay.innerHTML = `
          <div class="stats-overlay-backdrop"></div>
          <div class="stats-panel">
            <header class="stats-header">
              <h2>📊 דשבורד סטטיסטיקות</h2>
              <button class="stats-close-btn" title="סגור">✖</button>
            </header>
            <div class="stats-content">
              <!-- סטטיסטיקות כלליות -->
              <section class="stats-section">
                <h3>📈 סטטיסטיקות כלליות</h3>
                <div class="stats-grid">
                  <div class="stat-card">
                    <div class="stat-value">${allCandidates.length}</div>
                    <div class="stat-label">סה"כ מתמודדים</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value">${stats.avgOverall ?? '-'}</div>
                    <div class="stat-label">ממוצע כללי</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value">${stats.maxOverall ?? '-'}</div>
                    <div class="stat-label">ציון מקסימלי</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value">${stats.minOverall ?? '-'}</div>
                    <div class="stat-label">ציון מינימלי</div>
                  </div>
                </div>
              </section>
  
              <!-- התפלגות ציונים - עוגה -->
              <section class="stats-section">
                <h3>🎯 התפלגות ציונים (מעוגל)</h3>
                <div class="chart-container">
                  <canvas id="scoresDistChart" width="400" height="400"></canvas>
                </div>
                <div class="chart-legend" id="scoresLegend"></div>
              </section>
  
              <!-- השוואה בין פרמטרים -->
              <section class="stats-section">
                <h3>📊 ממוצעים לפי פרמטר</h3>
                <div class="chart-zoom-controls">
                  <button class="zoom-btn" data-chart="paramsCompareChart" data-action="in">🔍 +</button>
                  <button class="zoom-btn" data-chart="paramsCompareChart" data-action="out">🔍 -</button>
                  <button class="zoom-btn" data-chart="paramsCompareChart" data-action="reset">↺ אפס</button>
                </div>
                <div class="chart-container chart-scroll" id="paramsContainer">
                  <canvas id="paramsCompareChart" width="600" height="300"></canvas>
                </div>
              </section>
  
              <!-- התפלגות לפי קבוצות -->
              <section class="stats-section">
                <h3>👥 ממוצעים לפי קבוצה</h3>
                <div class="chart-zoom-controls">
                  <button class="zoom-btn" data-chart="groupsChart" data-action="in">🔍 +</button>
                  <button class="zoom-btn" data-chart="groupsChart" data-action="out">🔍 -</button>
                  <button class="zoom-btn" data-chart="groupsChart" data-action="reset">↺ אפס</button>
                </div>
                <div class="chart-container chart-scroll" id="groupsContainer">
                  <canvas id="groupsChart" width="800" height="400"></canvas>
                </div>
              </section>
  
              <!-- סטטיסטיקות מעריכים -->
              <section class="stats-section">
                <h3>🎓 מתמודדים לפי מעריך</h3>
                <div class="chart-zoom-controls">
                  <button class="zoom-btn" data-chart="evaluatorsChart" data-action="in">🔍 +</button>
                  <button class="zoom-btn" data-chart="evaluatorsChart" data-action="out">🔍 -</button>
                  <button class="zoom-btn" data-chart="evaluatorsChart" data-action="reset">↺ אפס</button>
                </div>
                <div class="chart-container chart-scroll" id="evaluatorsContainer" style="max-height: 500px; overflow-y: auto;">
                  <canvas id="evaluatorsChart"></canvas>
                </div>
              </section>
  
              <!-- טבלת Top 10 -->
              <section class="stats-section">
                <h3>🏆 Top 10 מתמודדים</h3>
                <div class="top-table">
                  ${this.buildTopTable(allCandidates)}
                </div>
              </section>
            </div>
          </div>
        `;
        
        document.body.appendChild(overlay);
        
        // אנימציה
        requestAnimationFrame(() => overlay.classList.add('visible'));
        
        // אירועים
        overlay.querySelector('.stats-close-btn').addEventListener('click', () => this.close());
        overlay.querySelector('.stats-overlay-backdrop').addEventListener('click', () => this.close());
        
        // הוספת אירועי זום
        this.initZoomControls();
        
        // ציור הגרפים
        setTimeout(() => {
          this.drawScoresDistributionChart(stats);
          this.drawParamsComparisonChart(stats);
          this.drawGroupsChart();
          this.drawEvaluatorsChart();
        }, 100);
      }
  
      /**
       * סגירת חלון דשבורד הסטטיסטיקות
       */
      close() {
        const overlay = document.getElementById('statsOverlay');
        if (overlay) {
          overlay.classList.remove('visible');
          setTimeout(() => overlay.remove(), 300);
        }
      }
  
      /**
       * חישוב סטטיסטיקות
       */
      calculateStatistics(candidates) {
        const validCandidates = candidates.filter(c => c.overallAvg !== null);
        
        if (validCandidates.length === 0) {
          return {
            avgOverall: null,
            avgSprint: null,
            avgCrawl: null,
            avgStretcher: null,
            maxOverall: null,
            minOverall: null,
            distribution: {}
          };
        }
  
        // ממוצעים
        const avgOverall = (validCandidates.reduce((sum, c) => sum + c.overallAvg, 0) / validCandidates.length).toFixed(2);
        const sprintScores = candidates.filter(c => c.sprintAvg !== null).map(c => c.sprintAvg);
        const crawlScores = candidates.filter(c => c.crawlingAvg !== null).map(c => c.crawlingAvg);
        const stretcherScores = candidates.filter(c => c.stretcherAvg !== null).map(c => c.stretcherAvg);
        
        const avgSprint = sprintScores.length ? (sprintScores.reduce((a,b) => a+b, 0) / sprintScores.length).toFixed(2) : null;
        const avgCrawl = crawlScores.length ? (crawlScores.reduce((a,b) => a+b, 0) / crawlScores.length).toFixed(2) : null;
        const avgStretcher = stretcherScores.length ? (stretcherScores.reduce((a,b) => a+b, 0) / stretcherScores.length).toFixed(2) : null;
  
        // מקסימום ומינימום
        const maxOverall = Math.max(...validCandidates.map(c => c.overallAvg)).toFixed(2);
        const minOverall = Math.min(...validCandidates.map(c => c.overallAvg)).toFixed(2);
  
        // התפלגות ציונים מעוגלים
        const distribution = {};
        validCandidates.forEach(c => {
          const rounded = Math.round(c.overallAvg);
          distribution[rounded] = (distribution[rounded] || 0) + 1;
        });
  
        return {
          avgOverall,
          avgSprint,
          avgCrawl,
          avgStretcher,
          maxOverall,
          minOverall,
          distribution
        };
      }
  
      /**
       * ציור גרף עוגת התפלגות ציונים
       */
      drawScoresDistributionChart(stats) {
        const canvas = document.getElementById('scoresDistChart');
        if (!canvas) return;
  
        const ctx = canvas.getContext('2d');
        const dist = stats.distribution;
        const scores = Object.keys(dist).sort((a, b) => a - b);
        const counts = scores.map(s => dist[s]);
  
        // צבעים
        const colors = [
          '#ef4444', '#f97316', '#f59e0b', '#eab308', 
          '#84cc16', '#22c55e', '#10b981', '#14b8a6'
        ];
  
        // ציור עוגה
        const total = counts.reduce((a, b) => a + b, 0);
        let currentAngle = -Math.PI / 2;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;
  
        scores.forEach((score, i) => {
          const sliceAngle = (counts[i] / total) * 2 * Math.PI;
          
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
          ctx.closePath();
          ctx.fillStyle = colors[i % colors.length];
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
  
          // טקסט באמצע הפרוסה
          const labelAngle = currentAngle + sliceAngle / 2;
          const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
          const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
          
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${counts[i]}`, labelX, labelY);
  
          currentAngle += sliceAngle;
        });
  
        // מקרא
        const legend = document.getElementById('scoresLegend');
        if (legend) {
          legend.innerHTML = scores.map((score, i) => `
            <div class="legend-item">
              <span class="legend-color" style="background-color: ${colors[i % colors.length]}"></span>
              <span>ציון ${score}: ${counts[i]} מתמודדים (${((counts[i]/total)*100).toFixed(1)}%)</span>
            </div>
          `).join('');
        }
      }
  
      /**
       * ציור גרף השוואת פרמטרים
       */
      drawParamsComparisonChart(stats) {
        const canvas = document.getElementById('paramsCompareChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const isDark = document.body.classList.contains('dark');
        
        const params = [
          { label: 'ספרינט', value: parseFloat(stats.avgSprint) || 0, color: '#3b82f6' },
          { label: 'זחילה', value: parseFloat(stats.avgCrawl) || 0, color: '#10b981' },
          { label: 'אלונקה', value: parseFloat(stats.avgStretcher) || 0, color: '#f59e0b' }
        ];

        const maxValue = 7;
        const barHeight = 60;
        const spacing = 30;
        const padding = 80;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        params.forEach((param, i) => {
          const y = padding + i * (barHeight + spacing);
          const barWidth = (param.value / maxValue) * (canvas.width - padding * 2);

          // רקע
          ctx.fillStyle = isDark ? '#334155' : '#e5e7eb';
          ctx.fillRect(padding, y, canvas.width - padding * 2, barHeight);

          // עמודה
          ctx.fillStyle = param.color;
          ctx.fillRect(padding, y, barWidth, barHeight);
          
          // מסגרת לעמודה לניגודיות טובה יותר
          ctx.strokeStyle = isDark ? '#475569' : '#cbd5e1';
          ctx.lineWidth = 2;
          ctx.strokeRect(padding, y, canvas.width - padding * 2, barHeight);

          // טקסט תווית - עם צל לניגודיות
          ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)';
          ctx.shadowBlur = 4;
          ctx.fillStyle = isDark ? '#ffffff' : '#1f2937';
          ctx.font = 'bold 20px Heebo, Arial';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(param.label, padding - 15, y + barHeight / 2);

          // ערך - עם צל וניגודיות חזקה
          ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.9)';
          ctx.shadowBlur = 6;
          ctx.fillStyle = isDark ? '#fbbf24' : '#0f172a';
          ctx.font = 'bold 18px Heebo, Arial';
          ctx.textAlign = 'left';
          ctx.fillText(param.value.toFixed(2), padding + barWidth + 10, y + barHeight / 2);
          
          // איפוס צל
          ctx.shadowBlur = 0;
        });
      }
  
      /**
       * ציור גרף קבוצות
       */
      drawGroupsChart() {
        const canvas = document.getElementById('groupsChart');
        if (!canvas) return;
  
        const ctx = canvas.getContext('2d');
        const isDark = document.body.classList.contains('dark');
        
        const groupNumbers = this.parent._groupNumbers();
        const groupAvgs = groupNumbers.map(g => {
          const gData = this.parent.state.groups.get(g);
          const candidates = this.parent.aggregateGroup(gData);
          const validScores = candidates.filter(c => c.overallAvg !== null).map(c => c.overallAvg);
          return validScores.length ? validScores.reduce((a,b) => a+b, 0) / validScores.length : 0;
        });
  
        const maxValue = Math.max(...groupAvgs, 7);
        const barWidth = Math.min(80, (canvas.width - 100) / groupNumbers.length);
        const spacing = 20;
        const padding = 50;
        const chartHeight = canvas.height - padding * 2;
  
        // חישוב רוחב דינמי אם יש הרבה קבוצות
        const totalWidth = groupNumbers.length * (barWidth + spacing) + padding * 2;
        if (totalWidth > canvas.width) {
          canvas.width = totalWidth;
        }
  
        ctx.clearRect(0, 0, canvas.width, canvas.height);
  
        groupNumbers.forEach((group, i) => {
          const x = padding + i * (barWidth + spacing);
          const barHeight = (groupAvgs[i] / maxValue) * chartHeight;
          const y = canvas.height - padding - barHeight;
  
          // עמודה עם גרדיאנט
          const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
          gradient.addColorStop(0, '#a78bfa');
          gradient.addColorStop(1, '#8b5cf6');
          ctx.fillStyle = gradient;
          ctx.fillRect(x, y, barWidth, barHeight);
          
          // מסגרת לעמודה
          ctx.strokeStyle = isDark ? '#6d28d9' : '#7c3aed';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, barWidth, barHeight);
  
          // תווית קבוצה - עם צל חזק
          ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.9)';
          ctx.shadowBlur = 5;
          ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
          ctx.font = 'bold 18px Heebo, Arial';
          ctx.textAlign = 'center';
          ctx.fillText(group, x + barWidth / 2, canvas.height - 15);
  
          // ערך - עם רקע מודגש
          ctx.shadowBlur = 0;
          
          // רקע לטקסט הערך
          const valueText = groupAvgs[i].toFixed(1);
          ctx.font = 'bold 16px Heebo, Arial';
          const textWidth = ctx.measureText(valueText).width;
          const bgPadding = 6;
          
          ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)';
          ctx.fillRect(
            x + barWidth / 2 - textWidth / 2 - bgPadding, 
            y - 28, 
            textWidth + bgPadding * 2, 
            22
          );
          
          ctx.strokeStyle = isDark ? '#fbbf24' : '#8b5cf6';
          ctx.lineWidth = 2;
          ctx.strokeRect(
            x + barWidth / 2 - textWidth / 2 - bgPadding, 
            y - 28, 
            textWidth + bgPadding * 2, 
            22
          );
          
          // טקסט הערך
          ctx.fillStyle = isDark ? '#fbbf24' : '#7c3aed';
          ctx.fillText(valueText, x + barWidth / 2, y - 14);
        });
      }
  
      /**
       * ציור גרף מעריכים
       */
      drawEvaluatorsChart() {
        const canvas = document.getElementById('evaluatorsChart');
        if (!canvas) return;
  
        const ctx = canvas.getContext('2d');
        const isDark = document.body.classList.contains('dark');
        
        // ספירת מתמודדים לפי מעריך
        const evaluatorCounts = {};
        this.parent.state.groups.forEach(gData => {
          gData.evaluators.forEach((evalData, name) => {
            const count = (evalData.runners || []).length;
            evaluatorCounts[name] = (evaluatorCounts[name] || 0) + count;
          });
        });
  
        const evaluators = Object.keys(evaluatorCounts).sort((a, b) => evaluatorCounts[b] - evaluatorCounts[a]);
        const counts = evaluators.map(e => evaluatorCounts[e]);
        const maxCount = Math.max(...counts);
  
        const barHeight = 45;
        const spacing = 20;
        const padding = 150;
        
        // חישוב גובה דינמי לפי מספר מעריכים
        const totalHeight = evaluators.length * (barHeight + spacing) + 40;
        canvas.height = Math.max(400, totalHeight);
        canvas.width = 900;
  
        ctx.clearRect(0, 0, canvas.width, canvas.height);
  
        evaluators.forEach((evaluator, i) => {
          const y = 20 + i * (barHeight + spacing);
          const barWidth = (counts[i] / maxCount) * (canvas.width - padding - 80);
  
          // עמודה עם גרדיאנט
          const gradient = ctx.createLinearGradient(padding, y, padding + barWidth, y);
          gradient.addColorStop(0, '#f472b6');
          gradient.addColorStop(1, '#ec4899');
          ctx.fillStyle = gradient;
          ctx.fillRect(padding, y, barWidth, barHeight);
          
          // מסגרת לעמודה
          ctx.strokeStyle = isDark ? '#be185d' : '#db2777';
          ctx.lineWidth = 2;
          ctx.strokeRect(padding, y, barWidth, barHeight);
  
          // שם מעריך - עם צל חזק
          ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.9)';
          ctx.shadowBlur = 5;
          ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
          ctx.font = 'bold 18px Heebo, Arial';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(evaluator, padding - 15, y + barHeight / 2);
  
          // כמות - עם רקע מודגש
          ctx.shadowBlur = 0;
          
          const countText = counts[i].toString();
          ctx.font = 'bold 16px Heebo, Arial';
          const textWidth = ctx.measureText(countText).width;
          const bgPadding = 8;
          
          // רקע לכמות
          ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)';
          ctx.fillRect(
            padding + barWidth + 8, 
            y + barHeight / 2 - 12, 
            textWidth + bgPadding * 2, 
            24
          );
          
          ctx.strokeStyle = isDark ? '#10b981' : '#ec4899';
          ctx.lineWidth = 2;
          ctx.strokeRect(
            padding + barWidth + 8, 
            y + barHeight / 2 - 12, 
            textWidth + bgPadding * 2, 
            24
          );
          
          // טקסט הכמות
          ctx.fillStyle = isDark ? '#10b981' : '#be185d';
          ctx.textAlign = 'center';
          ctx.fillText(countText, padding + barWidth + 8 + bgPadding + textWidth / 2, y + barHeight / 2);
        });
      }
  
      /**
       * בניית טבלת Top 10
       */
      buildTopTable(candidates) {
        const top10 = candidates
          .filter(c => c.overallAvg !== null)
          .sort((a, b) => b.overallAvg - a.overallAvg)
          .slice(0, 10);
  
        return `
          <table class="stats-table">
            <thead>
              <tr>
                <th>דירוג</th>
                <th>כתף</th>
                <th>קבוצה</th>
                <th>ציון כולל</th>
              </tr>
            </thead>
            <tbody>
              ${top10.map((c, i) => `
                <tr class="${i < 3 ? `top-${i+1}` : ''}">
                  <td>${i + 1}</td>
                  <td>${c.shoulder}</td>
                  <td>${c.group}</td>
                  <td><strong>${c.overallAvg}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }

      /**
       * אתחול בקרי זום לגרפים
       */
      initZoomControls() {
        const zoomLevels = new Map([
          ['paramsCompareChart', { current: 1, min: 0.8, max: 2.5, step: 0.2 }],
          ['groupsChart', { current: 1, min: 0.8, max: 3, step: 0.2 }],
          ['evaluatorsChart', { current: 1, min: 0.8, max: 3, step: 0.2 }]
        ]);

        document.querySelectorAll('.zoom-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const chartId = btn.dataset.chart;
            const action = btn.dataset.action;
            const canvas = document.getElementById(chartId);
            if (!canvas) return;

            const zoomData = zoomLevels.get(chartId);
            
            if (action === 'in') {
              zoomData.current = Math.min(zoomData.current + zoomData.step, zoomData.max);
            } else if (action === 'out') {
              zoomData.current = Math.max(zoomData.current - zoomData.step, zoomData.min);
            } else if (action === 'reset') {
              zoomData.current = 1;
            }

            // החלת הזום
            canvas.style.transform = `scale(${zoomData.current})`;
            canvas.style.transformOrigin = 'right top';
            
            // עדכון מצב הכפתורים
            const container = canvas.closest('.chart-container');
            container.style.justifyContent = zoomData.current > 1 ? 'flex-start' : 'center';
          });
        });
      }
    }
  
    // חשיפה גלובלית
    window.StatsDashboard = StatsDashboard;
  })();