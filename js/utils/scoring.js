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

  function calculateSprintFinalScore(runner) {
    const perHeatScores = (window.state?.heats || []).flatMap(heat => {
      const entry = getSprintHeatResults(heat).find(r => r.shoulderNumber === runner.shoulderNumber);
      return entry ? [entry.score] : [];
    });
    if (perHeatScores.length === 0) return 1;
    return Math.min(7, Math.max(1, Math.round(perHeatScores.reduce((s, v) => s + v, 0) / perHeatScores.length)));
  }

  function getCrawlingSprintScore(runner) {
    const sprints = window.state?.crawlingDrills?.sprints || [];
    const perHeatScores = sprints.flatMap(sprint => {
      const entry = getCrawlingSprintHeatResults(sprint).find(r => r.shoulderNumber === runner.shoulderNumber);
      return entry ? [entry.score] : [];
    });
    if (perHeatScores.length === 0) return 1;
    return Math.min(7, Math.max(1, Math.round(perHeatScores.reduce((s, v) => s + v, 0) / perHeatScores.length)));
  }

  function getSackCarryScore(runner) {
    const carriers = window.state?.crawlingDrills?.sackCarriers || {};
    const sackTime = carriers[runner.shoulderNumber]?.totalTime || 0;
    const allSackTimes = Object.values(carriers).map(c => c.totalTime || 0);
    const maxSackTime = Math.max(...allSackTimes, 0);
    return normalizeScore(sackTime, 0, maxSackTime);
  }

  function calculateCrawlingFinalScore(runner) {
    const statuses = window.state?.crawlingDrills?.runnerStatuses || {};
    if (statuses[runner.shoulderNumber]) return 1;
    const sprintScore = getCrawlingSprintScore(runner);
    const sackScore = getSackCarryScore(runner);
    return Math.round((sprintScore + sackScore) / 2);
  }

  function calculateStretcherFinalScore(runner) {
    const st = window.state?.sociometricStretcher;
    const statuses = window.state?.crawlingDrills?.runnerStatuses || {};
    if (statuses[runner.shoulderNumber]) return 1;

    const heats = st?.heats || [];
    const stretcherCount = heats.filter(h => h.selections && h.selections[runner.shoulderNumber] === 'stretcher').length;
    const jerricanCount = heats.filter(h => h.selections && h.selections[runner.shoulderNumber] === 'jerrican').length;
    const totalWeighted = (stretcherCount * 1.14) + (jerricanCount * 0.57);

    const runners = window.state?.runners || [];
    const allWeighted = runners.map(r => {
      if (statuses[r.shoulderNumber]) return 0;
      const sCount = heats.filter(h => h.selections && h.selections[r.shoulderNumber] === 'stretcher').length;
      const jCount = heats.filter(h => h.selections && h.selections[r.shoulderNumber] === 'jerrican').length;
      return (sCount * 1.14) + (jCount * 0.57);
    });
    const maxCarries = Math.max(...allWeighted, 0);
    return normalizeScore(totalWeighted, 0, maxCarries);
  }

  window.Scoring = { normalizeScore, computeHeatResults, getSprintHeatResults, getCrawlingSprintHeatResults, calculateSprintFinalScore, getCrawlingSprintScore, getSackCarryScore, calculateCrawlingFinalScore, calculateStretcherFinalScore };
  window.normalizeScore ??= normalizeScore;
  window.computeHeatResults ??= computeHeatResults;
  window.getSprintHeatResults ??= getSprintHeatResults;
  window.getCrawlingSprintHeatResults ??= getCrawlingSprintHeatResults;
  window.calculateSprintFinalScore ??= calculateSprintFinalScore;
  window.getCrawlingSprintScore ??= getCrawlingSprintScore;
  window.getSackCarryScore ??= getSackCarryScore;
  window.calculateCrawlingFinalScore ??= calculateCrawlingFinalScore;
  window.calculateStretcherFinalScore ??= calculateStretcherFinalScore;
})();