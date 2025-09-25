// google-drive-reader.js
// Service to fetch unified aggregated Gibush JSON file for a given month/year
// Non-blocking; returns parsed JSON or throws.
(function(){
  if (window.GoogleDriveReader) return;

  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyIwSi6rGnPhHVaaPTsC5GvbVct_LjoHjycJKcrGlFIk_OniKcS7oMJpv2BIe1p1A/exec'; // same as uploader

  async function fetchAggregated({ year, month }) {
    if (!year || !month) throw new Error('חסר שנה או חודש');
    const mm = String(month).padStart(2,'0');
    const url = `${APPS_SCRIPT_URL}?action=downloadAggregatedExisting&year=${year}&month=${mm}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('שגיאת רשת');
    const txt = await res.text();
    let json;
    try { json = JSON.parse(txt); } catch(e){ throw new Error('JSON לא תקין'); }
    if (json.error) throw new Error(json.error);
    if (!Array.isArray(json)) {
      if (Array.isArray(json.items)) return json.items;
      throw new Error('מבנה קובץ לא צפוי');
    }
    return json;
  }

  window.GoogleDriveReader = { fetchAggregated };
})();