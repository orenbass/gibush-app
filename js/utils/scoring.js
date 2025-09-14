(function () {
  'use strict';
  function normalizeScore(value, min, max) {
    if (min === max) return value > min ? 7 : 1;
    const inverted = max < min;
    const lo = inverted ? max : min;
    const hi = inverted ? min : max;
    const v = Math.min(Math.max(value, lo), hi);
    let t = (v - lo) / (hi - lo);
    if (inverted) t = 1 - t;
    return Math.min(7, Math.max(1, Math.round(1 + t * 6)));
  }

  function computeHeatResults(arrivals = []) {
    // בדיקת בטיחות - וידוא שarrivals הוא מערך
    if (!Array.isArray(arrivals)) {
      console.warn('computeHeatResults: arrivals is not an array:', arrivals);
      return [];
    }
    
    const withOrder = arrivals.map((a, i) => ({ ...a, _order: i }));
    const isFinisher = a => typeof a.finishTime === 'number' && a.finishTime > 0;
    const finishers = withOrder.filter(isFinisher).sort((a, b) => (a.finishTime - b.finishTime) || (a._order - b._order));
    const dnfs = withOrder.filter(a => !isFinisher(a));
    const fastest = finishers.length ? finishers[0].finishTime : null;

    const results = [];
    finishers.forEach((a, idx) => {
      const score = fastest ? Math.max(1, Math.min(7, Math.round((7 * fastest) / a.finishTime))) : 1;
      results.push({ rank: idx + 1, shoulderNumber: a.shoulderNumber, finishTime: a.finishTime, score, comment: a.comment || null });
    });
    dnfs.forEach((a, i) => {
      results.push({ rank: finishers.length + i + 1, shoulderNumber: a.shoulderNumber, finishTime: null, score: 1, comment: a.comment || 'לא סיים' });
    });
    return results;
  }

  function getSprintHeatResults(heat) { return (!heat || !Array.isArray(heat.arrivals)) ? [] : computeHeatResults(heat.arrivals); }
  function getCrawlingSprintHeatResults(sprint) { return (!sprint || !Array.isArray(sprint.arrivals)) ? [] : computeHeatResults(sprint.arrivals); }

  // FIXED: חישוב ציון ספרינט סופי - כולל מתמודדים שהשתתפו אבל לא סיימו
  function calculateSprintFinalScore(runner) {
    const shoulderNumber = runner.shoulderNumber;
    const statuses = window.state?.crawlingDrills?.runnerStatuses || {};
    if (statuses[shoulderNumber] !== 'פעיל' && statuses[shoulderNumber] !== undefined) return 1;

    const heats = window.state?.heats || [];
    if (heats.length === 0) return 1;
    
    // סינון רק מקצים פעילים (שבהם לפחות אחד השתתף)
    const activeHeats = heats.filter(heat => heat.arrivals && heat.arrivals.length > 0);
    if (activeHeats.length === 0) return 1;
    
    const validScores = [];
    
    activeHeats.forEach(heat => {
      // עכשיו אנחנו עובדים רק עם מקצים פעילים
      const heatResults = window.computeHeatResults?.(heat.arrivals) || [];
      const runnerResult = heatResults.find(r => r.shoulderNumber === shoulderNumber);
      const runnerParticipated = heat.arrivals.some(a => a.shoulderNumber === shoulderNumber);
      
      if (runnerParticipated) {
        // אם הרץ השתתף במקצה הפעיל
        if (runnerResult && runnerResult.finishTime && runnerResult.finishTime > 0) {
          // אם יש לו זמן תקין - השתמש בציון המחושב
          validScores.push(runnerResult.score);
        } else {
          // אם השתתף אבל אין זמן תקין - ציון 1
          validScores.push(1);
        }
      } else {
        // אם לא השתתף במקצה פעיל - ציון 1
        validScores.push(1);
      }
    });
    
    // ממוצע הציונים מהמקצים הפעילים
    return Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length);
  }

  // FIXED: חישוב ציון זחילה ספרינט סופי - כולל מתמודדים שהשתתפו אבל לא סיימו
  function getCrawlingSprintScore(runner) {
    const shoulderNumber = runner.shoulderNumber;
    const statuses = window.state?.crawlingDrills?.runnerStatuses || {};
    if (statuses[shoulderNumber] !== 'פעיל' && statuses[shoulderNumber] !== undefined) return 1;

    const crawlingSprints = window.state?.crawlingDrills?.sprints || [];
    if (crawlingSprints.length === 0) return 1;
    
    // סינון רק זחילות פעילות (שבהן לפחות אחד השתתף)
    const activeCrawlingSprints = crawlingSprints.filter(sprint => 
      sprint.arrivals && sprint.arrivals.length > 0
    );
    if (activeCrawlingSprints.length === 0) return 1;
    
    const validScores = [];
    
    activeCrawlingSprints.forEach(sprint => {
      // עכשיו אנחנו עובדים רק עם זחילות פעילות
      const crawlingResults = window.getCrawlingSprintHeatResults?.(sprint) || [];
      const runnerResult = crawlingResults.find(r => r.shoulderNumber === shoulderNumber);
      const runnerParticipated = sprint.arrivals.some(a => a.shoulderNumber === shoulderNumber);
      
      if (runnerParticipated) {
        // אם הרץ השתתף בזחילה הפעילה
        if (runnerResult && runnerResult.finishTime && runnerResult.finishTime > 0) {
          // אם יש לו זמן תקין - השתמש בציון המחושב
          validScores.push(runnerResult.score);
        } else {
          // אם השתתף אבל אין זמן תקין - ציון 1
          validScores.push(1);
        }
      } else {
        // אם לא השתתף בזחילה פעילה - ציון 1
        validScores.push(1);
      }
    });
    
    // ממוצע הציונים מהזחילות הפעילות
    return Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length);
  }

  // FIXED: חישוב ציון אלונקות סוציומטריות - כולל מתמודדים שהשתתפו אבל לא נבחרו
  function calculateStretcherFinalScore(runner) {
    const shoulderNumber = runner.shoulderNumber;
    const statuses = window.state?.crawlingDrills?.runnerStatuses || {};
    if (statuses[shoulderNumber] !== 'פעיל' && statuses[shoulderNumber] !== undefined) return 1;

    const sociometricData = window.state?.sociometricStretcher;
    const heats = sociometricData?.heats || [];
    
    if (heats.length === 0) return 1;
    
    const validScores = [];
    
    heats.forEach(heat => {
      // בדיקה אם המקצה פעיל (יש בחירות או משתתפים רשומים)
      const selections = heat.selections || {};
      const participants = heat.participants || [];
      const hasSelections = Object.keys(selections).some(key => selections[key] && selections[key] !== '');
      const hasParticipants = participants.length > 0;
      const isActiveHeat = hasSelections || hasParticipants;
      
      // אם המקצה פעיל
      if (isActiveHeat) {
        const runnerParticipated = participants.includes(shoulderNumber) || 
                                  Object.keys(selections).includes(shoulderNumber.toString());
        
        if (runnerParticipated) {
          // אם הרץ השתתף במקצה
          const selection = selections[shoulderNumber];
          let score = 1; // ברירת מחדל למי שהשתתף אבל לא נבחר
          
          if (selection === 'stretcher') score = 7;      // אלונקה = ציון מלא
          else if (selection === 'jerrican') score = 3.5; // ג'ריקן = חצי ציון
          // אחרת - ציון 1 (השתתף אבל לא נבחר)
          
          validScores.push(score);
        }
      }
    });
    
    // אם לא השתתף באף מקצה פעיל - ציון 1
    if (validScores.length === 0) return 1;
    
    // ממוצע הציונים מכל המקצים שהשתתף בהם
    const averageScore = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
    
    return Math.round(averageScore);
  }

  // FIXED: פונקציה לקבלת פרטי אלונקות לרץ מסוים - כולל מתמודדים שהשתתפו אבל לא נבחרו
  function getRunnerStretcherDetails(shoulderNumber) {
    const sociometricData = window.state?.sociometricStretcher;
    const heats = sociometricData?.heats || [];
    
    // סינון רק מקצים פעילים (יש בחירות או משתתפים)
    const validHeats = heats.filter(heat => {
      const selections = heat.selections || {};
      const participants = heat.participants || [];
      const hasSelections = Object.keys(selections).some(key => selections[key] && selections[key] !== '');
      const hasParticipants = participants.length > 0;
      return hasSelections || hasParticipants;
    });
    
    const heatResults = validHeats.map((heat, index) => {
      const selections = heat.selections || {};
      const participants = heat.participants || [];
      const runnerParticipated = participants.includes(shoulderNumber) || 
                                Object.keys(selections).includes(shoulderNumber.toString());
      
      if (!runnerParticipated) {
        return {
          heatIndex: index + 1,
          heatName: `מקצה ${index + 1}`,
          role: 'לא השתתף',
          score: null,
          participated: false
        };
      }
      
      const selection = selections[shoulderNumber];
      let score = 1; // ברירת מחדל למי שהשתתף
      let role = 'השתתף - לא נבחר';
      
      if (selection === 'stretcher') {
        score = 7;
        role = 'אלונקה';
      } else if (selection === 'jerrican') {
        score = 3.5;
        role = 'ג\'ריקן';
      }
      
      return {
        heatIndex: index + 1,
        heatName: `מקצה ${index + 1}`,
        role,
        score,
        participated: true
      };
    });
    
    const participatedResults = heatResults.filter(h => h.participated);
    const validScores = participatedResults.map(h => h.score);
    const finalScore = validScores.length > 0 
      ? Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length)
      : 1;
    
    return {
      shoulderNumber,
      heatResults,
      finalScore,
      totalHeats: validHeats.length, // רק מקצים פעילים
      participatedHeats: participatedResults.length, // מקצים שהשתתף בהם
      stretcherCount: heatResults.filter(h => h.role === 'אלונקה').length,
      jerricanCount: heatResults.filter(h => h.role === 'ג\'ריקן').length,
      notSelectedCount: heatResults.filter(h => h.role === 'השתתף - לא נבחר').length,
      averageScore: validScores.length > 0 ? Math.round((validScores.reduce((sum, score) => sum + score, 0) / validScores.length) * 10) / 10 : 0
    };
  }

  function getSackCarryScore(runner) {
    const carriers = window.state?.crawlingDrills?.sackCarriers || {};
    const sackTime = carriers[runner.shoulderNumber]?.totalTime || 0;
    const allSackTimes = Object.values(carriers).map(c => c.totalTime || 0);
    const maxSackTime = Math.max(...allSackTimes, 0);
    return normalizeScore(sackTime, 0, maxSackTime);
  }

  // UPDATED: פונקציה מפושטת לציון זחילה קבוצתית סופי - רק על בסיס נשיאת שק
  function calculateCrawlingFinalScore(runner) {
    // הפונקציה עכשיו מחזירה רק את ציון הזחילה הקבוצתית
    return calculateCrawlingGroupScore(runner);
  }

  // NEW: חישוב וביצוע עדכון ציוני ספרינטים לכל הרצים
  function updateAllSprintScores() {
    if (!window.state) return;
    
    // יצירת מבנה נתונים לשמירת תוצאות מפורטות
    window.state.sprintResults = window.state.sprintResults || {};
    
    const runners = window.state.runners || [];
    const heats = window.state.heats || [];
    
    runners.forEach(runner => {
      const shoulderNumber = runner.shoulderNumber;
      
      // חישוב תוצאות עבור כל מקצה
      const heatResults = heats.map((heat, heatIndex) => {
        const results = getSprintHeatResults(heat);
        const runnerResult = results.find(r => r.shoulderNumber === shoulderNumber);
        
        return {
          heatIndex: heatIndex + 1,
          heatName: `מקצה ${heatIndex + 1}`,
          rank: runnerResult ? runnerResult.rank : null,
          finishTime: runnerResult ? runnerResult.finishTime : null,
          score: runnerResult ? runnerResult.score : null,
          participated: !!runnerResult,
          // NEW: שמירת מידע נוסף לייצוא
          status: runnerResult ? (runnerResult.finishTime ? 'סיים' : 'לא סיים') : 'לא השתתף',
          formattedTime: runnerResult && runnerResult.finishTime ? formatTime_no_ms(runnerResult.finishTime) : null
        };
      });
      
      // חישוב ציון סופי
      const validScores = heatResults.filter(h => h.score !== null).map(h => h.score);
      const finalScore = validScores.length > 0 
        ? Math.min(7, Math.max(1, Math.round(validScores.reduce((s, v) => s + v, 0) / validScores.length)))
        : 1;
      
      // שמירת הנתונים המפורטים
      window.state.sprintResults[shoulderNumber] = {
        shoulderNumber,
        heatResults,
        finalScore,
        totalHeats: heats.length,
        participatedHeats: heatResults.filter(h => h.participated).length,
        validScores,
        averageScore: validScores.length > 0 ? Math.round((validScores.reduce((s, v) => s + v, 0) / validScores.length) * 10) / 10 : 0,
        bestRank: heatResults.filter(h => h.rank !== null).length > 0 ? Math.min(...heatResults.filter(h => h.rank !== null).map(h => h.rank)) : null,
        worstRank: heatResults.filter(h => h.rank !== null).length > 0 ? Math.max(...heatResults.filter(h => h.rank !== null).map(h => h.rank)) : null,
        lastUpdated: new Date().toISOString()
      };
    });
    
    // שמירת המצב
    if (typeof window.saveState === 'function') {
      window.saveState();
    }
  }

  // NEW: פונקציה לייצוא נתוני ספרינטים לפורמט Excel משופר
  function exportSprintResultsForExcel() {
    const runners = window.state?.runners || [];
    const heats = window.state?.heats || [];
    
    if (runners.length === 0) return [];
    
    const exportData = runners.map(runner => {
      const shoulderNumber = runner.shoulderNumber;
      const details = getRunnerSprintDetails(shoulderNumber);
      
      if (!details) {
        // יצירת שורה בסיסית אם אין נתונים
        const row = {
          'מספר כתף': shoulderNumber,
          'ציון סופי ספרינטים': 1,
          'מקצים השתתף': 0,
          'סה״כ מקצים': heats.length,
          'ממוצע מיקומים': 'לא השתתף',
          'מיקום טוב ביותר': 'לא השתתף',
          'מיקום גרוע ביותר': 'לא השתתף'
        };
        
        // הוספת עמודות ריקות לכל מקצה
        heats.forEach((heat, index) => {
          row[`מקצה ${index + 1} - מיקום`] = 'לא השתתף';
          row[`מקצה ${index + 1} - זמן`] = 'לא סיים';
          row[`מקצה ${index + 1} - ציון`] = 'לא השתתף';
          row[`מקצה ${index + 1} - סטטוס`] = 'לא השתתף';
        });
        
        return row;
      }
      
      const row = {
        'מספר כתף': shoulderNumber,
        'ציון סופי ספרינטים': details.finalScore,
        'מקצים השתתף': details.summary.participatedHeats,
        'סה״כ מקצים': details.summary.totalHeats,
        'ממוצע מיקומים': details.summary.averageRank || 'לא השתתף',
        'ממוצע ציונים': details.sprintResults.averageScore || 0,
        'מיקום טוב ביותר': details.sprintResults.bestRank || 'לא השתתף',
        'מיקום גרוע ביותר': details.sprintResults.worstRank || 'לא השתתף'
      };
      
      // הוספת עמודות מפורטות לכל מקצה
      details.heatResults.forEach((heatResult, index) => {
        const heatNum = index + 1;
        row[`מקצה ${heatNum} - מיקום`] = heatResult.rank || 'לא השתתף';
        row[`מקצה ${heatNum} - זמן`] = heatResult.formattedTime || 'לא סיים';
        row[`מקצה ${heatNum} - ציון`] = heatResult.score || 'לא השתתף';
        row[`מקצה ${heatNum} - סטטוס`] = heatResult.status || 'לא השתתף';
      });
      
      return row;
    });
    
    return exportData;
  }

  // NEW: פונקציה להצגת תוצאות מפורטות של רץ
  function getRunnerSprintDetails(shoulderNumber) {
    const results = window.state?.sprintResults?.[shoulderNumber];
    if (!results) return null;
    
    return {
      shoulderNumber,
      finalScore: results.finalScore,
      heatResults: results.heatResults,
      sprintResults: {
        averageScore: results.averageScore,
        bestRank: results.bestRank,
        worstRank: results.worstRank,
        validScores: results.validScores
      },
      summary: {
        totalHeats: results.totalHeats,
        participatedHeats: results.participatedHeats,
        averageRank: results.heatResults.filter(h => h.rank !== null).length > 0
          ? Math.round(results.heatResults.filter(h => h.rank !== null).reduce((sum, h) => sum + h.rank, 0) / results.heatResults.filter(h => h.rank !== null).length * 10) / 10
          : null
      }
    };
  }

  // Helper function for time formatting
  function formatTime_no_ms(ms) {
    if (!ms || ms <= 0) return '00:00';
    const totalSec = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // UPDATED: פונקציות לחישוב ציון זחילה קבוצתית - ציון גבוה יותר למי שסחב יותר זמן
  function calculateCrawlingGroupScore(runner) {
    const shoulderNumber = runner.shoulderNumber;
    const carriers = window.state?.crawlingDrills?.sackCarriers || {};
    const allRunners = window.state?.runners || [];
    const activeRunners = allRunners.filter(r => 
      (window.state?.crawlingDrills?.runnerStatuses?.[r.shoulderNumber] || 'פעיל') === 'פעיל'
    );
    
    if (activeRunners.length === 0) return 1;
    
    // חישוב זמני נשיאת שק של כל הרצים הפעילים
    const sackTimes = activeRunners.map(r => {
      const carrierData = carriers[r.shoulderNumber];
      return {
        shoulderNumber: r.shoulderNumber,
        totalTime: carrierData?.totalTime || 0
      };
    }).filter(r => r.totalTime > 0); // רק מי שנשא שק
    
    if (sackTimes.length === 0) return 1;
    
    // מיון לפי זמן (ארוך יותר = טוב יותר) - שינוי כיוון המיון
    sackTimes.sort((a, b) => b.totalTime - a.totalTime);
    
    // מציאת מיקום הרץ הנוכחי
    const runnerTime = carriers[shoulderNumber]?.totalTime || 0;
    if (runnerTime === 0) return 1; // לא נשא שק
    
    const rank = sackTimes.findIndex(r => r.shoulderNumber === shoulderNumber) + 1;
    
    // המרה לסקלה 1-7 (ככל שהמיקום טוב יותר - זמן יותר ארוך, הציון גבוה יותר)
    const totalParticipants = sackTimes.length;
    const normalizedScore = ((totalParticipants - rank + 1) / totalParticipants) * 6 + 1;
    
    return Math.round(normalizedScore);
  }

  window.Scoring = { 
    normalizeScore, 
    computeHeatResults, 
    getSprintHeatResults, 
    getCrawlingSprintHeatResults, 
    calculateSprintFinalScore, 
    getCrawlingSprintScore, 
    getSackCarryScore, 
    calculateCrawlingFinalScore, 
    calculateStretcherFinalScore,
    updateAllSprintScores,
    getRunnerSprintDetails,
    exportSprintResultsForExcel,
    // NEW: פונקציה חדשה לפרטי אלונקות
    getRunnerStretcherDetails
  };

  window.normalizeScore ??= normalizeScore;
  window.computeHeatResults ??= computeHeatResults;
  window.getSprintHeatResults ??= getSprintHeatResults;
  window.getCrawlingSprintHeatResults ??= getCrawlingSprintHeatResults;
  window.calculateSprintFinalScore ??= calculateSprintFinalScore;
  window.getCrawlingSprintScore ??= getCrawlingSprintScore;
  window.getSackCarryScore ??= getSackCarryScore;
  window.calculateCrawlingFinalScore ??= calculateCrawlingFinalScore;
  window.calculateStretcherFinalScore ??= calculateStretcherFinalScore;
  window.updateAllSprintScores ??= updateAllSprintScores;
  window.getRunnerSprintDetails ??= getRunnerSprintDetails;
  window.exportSprintResultsForExcel ??= exportSprintResultsForExcel;
  window.getRunnerStretcherDetails ??= getRunnerStretcherDetails;
})();