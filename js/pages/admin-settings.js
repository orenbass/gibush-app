(function () {
  window.Pages = window.Pages || {};
  
  window.Pages.renderAdminSettingsPage = function renderAdminSettingsPage() {
    const root = document.getElementById('content') || (typeof contentDiv !== 'undefined' ? contentDiv : null);
    if (!root) return;

    // הסתר חלונית התגובה המהירה
    const quickBarDiv = document.getElementById('quick-comment-bar-container');
    if (quickBarDiv) {
      quickBarDiv.style.display = 'none';
    }
    document.body.classList.add('hide-quick-comments');

    // State management for admin settings
    let currentSubPage = 'exercises'; // exercises, backup, users, quick-comments
    let exercisesDirty = false;
    let backupDirty = false;
    let usersDirty = false;
    let quickCommentsDirty = false; // NEW

    const originalSnapshot = JSON.parse(JSON.stringify(CONFIG));
    
    // Initialize backup settings if not exist
    if (!CONFIG.AUTO_BACKUP_SETTINGS) {
      CONFIG.AUTO_BACKUP_SETTINGS = {
        enabled: CONFIG.AUTO_BACKUP_UPLOAD_ENABLED || true,
        intervalMinutes: (CONFIG.AUTO_BACKUP_UPLOAD_INTERVAL_MS || 30000) / 60000,
        stopAfterMinutes: (CONFIG.AUTO_BACKUP_UPLOAD_MAX_DURATION_MS || 5 * 60 * 60 * 1000) / 60000
      };
    }

    // Global functions for user management
    // NEW: יצירת עותק עריך לעריכת משתמשים (ה-USERS_CONFIG.users הוא getter דינמי שאי אפשר לשנות ישירות)
    let editableUsers = window.USERS_CONFIG?.users ? window.USERS_CONFIG.users.map(u => ({ ...u })) : [];
    const normalizeEmail = (email) => String(email||'').trim().toLowerCase();

    window.editUser = (index) => {
      const user = editableUsers[index];
      if (!user) return;
      showUserEditModal(user, index);
    };

    window.removeUser = (index) => {
      const user = editableUsers[index];
      if (!user) return;
      
      const displayName = user.name || user.email || 'משתמש ללא שם';
      if (!confirm(`האם אתה בטוח שברצונך להסיר את המשתמש "${displayName}"?`)) return;
      
      editableUsers.splice(index, 1);
      usersDirty = true;
      renderSubPage();
      updateDirtyState();
    };

    const showUserEditModal = (user, index) => {
      const isNewUser = index === -1;
      const modalTitle = isNewUser ? 'הוספת משתמש חדש' : 'עריכת פרטי משתמש';
      
      const backdrop = document.createElement('div');
      backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50';
      backdrop.id = 'user-edit-modal';

      backdrop.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md mx-4 text-right">
          <h3 class="text-xl font-bold mb-6 text-center text-blue-600 dark:text-blue-400">${modalTitle}</h3>
          
          <div class="space-y-4 mb-6">
            <div>
              <label class="block text-right mb-2 text-sm font-medium">שם מלא:</label>
              <input type="text" id="edit-user-name" value="${user.name || ''}" placeholder="הזן שם מלא"
                     class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg text-lg text-right bg-white dark:bg-gray-700 dark:text-white">
            </div>
            
            <div>
              <label class="block text-right mb-2 text-sm font-medium">כתובת מייל:</label>
              <input type="email" id="edit-user-email" value="${user.email || ''}" placeholder="example@gmail.com"
                     class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg text-lg text-right bg-white dark:bg-gray-700 dark:text-white">
            </div>
            
            <div class="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
              <label class="flex items-center space-x-2 space-x-reverse cursor-pointer">
                <input type="checkbox" id="edit-user-admin" ${user.isAdmin ? 'checked' : ''} 
                       class="rounded border-purple-300 text-purple-600 focus:ring-purple-500">
                <div class="flex-1">
                  <span class="text-sm font-medium text-purple-900 dark:text-purple-100 flex items-center gap-2">
                    🛡️ הרשאות מנהל
                  </span>
                  <p class="text-xs text-purple-700 dark:text-purple-300 mt-1">
                    מנהלים מקבלים גישה לדשבורד המאוחד ולהגדרות מתקדמות
                  </p>
                </div>
              </label>
            </div>
          </div>
          
          <div class="flex justify-center gap-4">
            <button id="save-user-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2">
              💾 ${isNewUser ? 'הוסף משתמש' : 'שמור שינויים'}
            </button>
            <button id="cancel-user-btn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg">
              ❌ ביטול
            </button>
          </div>
          
          <div id="user-edit-error" class="mt-4 text-red-500 text-center text-sm hidden"></div>
        </div>
      `;

      document.body.appendChild(backdrop);

      setTimeout(() => {
        document.getElementById('edit-user-name').focus();
      }, 100);

      document.getElementById('save-user-btn').addEventListener('click', () => {
        const name = document.getElementById('edit-user-name').value.trim();
        let email = document.getElementById('edit-user-email').value.trim();
        email = normalizeEmail(email);
        const isAdmin = document.getElementById('edit-user-admin').checked;

        if (!email) {
          showUserError('יש להזין כתובת מייל');
          return;
        }

        const existingIndex = editableUsers.findIndex((u, i) => 
          normalizeEmail(u.email) === email && i !== index
        );
        if (existingIndex !== -1) {
          showUserError('כתובת מייל זו כבר קיימת במערכת');
          return;
        }

        if (isAdmin && !user.isAdmin) {
          if (!confirm(`האם אתה בטוח שברצונך להעניק הרשאות מנהל ל-"${name || email}"?`)) {
            return;
          }
        }

        const updatedUser = { name, email, isAdmin };

        if (isNewUser) {
          editableUsers.push(updatedUser);
        } else {
          editableUsers[index] = updatedUser;
        }

        usersDirty = true;
        closeUserModal();
        renderSubPage();
        updateDirtyState();
      });

      document.getElementById('cancel-user-btn').addEventListener('click', closeUserModal);
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeUserModal();
      });
      document.addEventListener('keydown', handleEscapeKey);

      function showUserError(message) {
        const errorDiv = document.getElementById('user-edit-error');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
      }

      function closeUserModal() {
        document.removeEventListener('keydown', handleEscapeKey);
        document.body.removeChild(backdrop);
      }

      function handleEscapeKey(e) {
        if (e.key === 'Escape') closeUserModal();
      }
    };

    const addNewUser = () => {
      const newUser = { name: '', email: '', isAdmin: false };
      showUserEditModal(newUser, -1);
    };

    const renderMainLayout = () => {
      root.innerHTML = `
        <div class="max-w-6xl mx-auto p-4 space-y-6" dir="rtl">
          <h2 class="text-2xl font-bold text-center mb-6">הגדרות מנהל</h2>
          
          <nav class="border-b border-gray-200 mb-6">
            <div class="flex justify-center">
              <div class="grid grid-cols-2 sm:flex sm:flex-wrap gap-1 w-full sm:w-auto sm:justify-center">
                <button data-subpage="exercises" class="admin-nav-tab compact ${currentSubPage === 'exercises' ? 'active' : ''}">
                  <span>⚙️</span>
                  <span>מקצים</span>
                </button>
                <button data-subpage="backup" class="admin-nav-tab compact ${currentSubPage === 'backup' ? 'active' : ''}">
                  <span>💾</span>
                  <span>גיבוי</span>
                </button>
                <button data-subpage="users" class="admin-nav-tab compact ${currentSubPage === 'users' ? 'active' : ''}">
                  <span>👥</span>
                  <span>משתמשים</span>
                </button>
                <button data-subpage="quick-comments" class="admin-nav-tab compact ${currentSubPage === 'quick-comments' ? 'active' : ''}">
                  <span>📝</span>
                  <span>הערות מהירות</span>
                </button>
              </div>
            </div>
          </nav>

          <div id="subpage-content" class="min-h-96"></div>
          
          <div class="flex flex-wrap gap-3 justify-center pt-6 border-t border-gray-200">
            <button id="btn-save-all" class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed" disabled>
              💾 שמור הכל
            </button>
            <button id="btn-cancel-all" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg">
              ❌ ביטול
            </button>
          </div>
          
          <div class="text-center">
            <span id="dirty-indicator" class="text-sm px-3 py-2 rounded-full bg-amber-100 text-amber-800 border border-amber-300 hidden">
              ⚠️ יש שינויים שלא נשמרו
            </span>
          </div>
        </div>
      `;
      
      renderSubPage();
      attachEventListeners();
    };

    const renderExercisesPage = () => {
      const fields = [
        { key: 'MAX_RUNNERS', label: 'כמות רצים מקסימלית', type: 'number', min: 1 },
        { key: 'NUM_HEATS', label: 'מספר מקצי ספרינטים', type: 'number', min: 1 },
        { key: 'MAX_CRAWLING_SPRINTS', label: 'מספר מקצי ספרינט זחילות', type: 'number', min: 0 },
        { key: 'NUM_STRETCHER_HEATS', label: 'מספר מקצי אלונקה/סחיבת איכר', type: 'number', min: 0 },
        { key: 'MAX_STRETCHER_CARRIERS', label: 'כמות נושאים מקסימלית (אלונקה/סחיבת איכר)', type: 'number', min: 0 },
        { key: 'MAX_JERRICAN_CARRIERS', label: 'כמות נושאי ג\'ריקן מקסימלית', type: 'number', min: 0 }
      ];

      const makeFieldRow = f => {
        const val = CONFIG[f.key] ?? '';
        return `
          <div class="space-y-1">
            <label class="block text-right text-sm font-medium" for="f-${f.key}">${f.label}</label>
            <div class="flex gap-2 items-start">
              <input
                id="f-${f.key}"
                data-key="${f.key}"
                data-category="exercises"
                type="${f.type}"
                ${f.min !== undefined ? `min="${f.min}"` : ''}
                class="flex-1 p-2 border rounded-lg text-right"
                value="${String(val).replace(/"/g,'&quot;')}"
                ${f.placeholder ? `placeholder="${f.placeholder}"` : ''}/>
              <button data-reset="${f.key}" class="text-xs px-2 py-1 border rounded hover:bg-gray-100">איפוס</button>
            </div>
            <p data-err="${f.key}" class="text-xs text-red-600 hidden"></p>
          </div>
        `;
      };

      return `
        <div class="space-y-4">
          <div class="p-3 bg-yellow-100 border-r-4 border-yellow-500 text-yellow-800 text-sm rounded">
            <strong>אזהרה:</strong> שמירת הגדרות המקצים תאפס את כל נתוני הגיבוש (רצים, מקצים, הערות וכו').
          </div>
          <form id="exercises-form" class="space-y-5">
            ${fields.map(makeFieldRow).join('')}
          </form>
        </div>
      `;
    };

    const renderBackupPage = () => {
      const settings = CONFIG.AUTO_BACKUP_SETTINGS;
      const isAutoBackupActive = window.autoBackupManager?.state?.autoBackupUpload?.isActive;
      
      return `
        <div class="space-y-6">
          <div class="bg-blue-50 border-r-4 border-blue-400 text-blue-800 text-sm rounded-lg p-4">
            <strong>מידע:</strong> הגדרות גיבוי אוטומטי. הגיבוי מתחיל אוטומטית עם תחילת המקצים.
          </div>
          
          <div class="bg-white border rounded-lg p-4 shadow-sm">
            <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
              📊 מצב גיבוי אוטומטי
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span class="font-medium">סטטוס:</span>
                <span class="mr-2 px-2 py-1 rounded text-xs ${isAutoBackupActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}">
                  ${isAutoBackupActive ? '🟢 פעיל' : '🔴 לא פעיל'}
                </span>
              </div>
            </div>
          </div>
          
          <form id="backup-form" class="bg-white border rounded-lg p-4 shadow-sm space-y-5">
            <h3 class="text-lg font-semibold mb-3">🔧 הגדרות גיבוי</h3>
            
            <div class="space-y-1">
              <label class="flex items-center space-x-2 space-x-reverse">
                <input type="checkbox" id="auto-backup-enabled" data-key="enabled" data-category="backup" 
                       ${settings.enabled ? 'checked' : ''} class="rounded">
                <span class="text-sm font-medium">הפעל גיבוי אוטומטי</span>
              </label>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-right text-sm font-medium" for="backup-interval">
                  מרווח גיבוי (בדקות)
                </label>
                <input
                  id="backup-interval"
                  data-key="intervalMinutes"
                  data-category="backup"
                  type="number"
                  min="0.5"
                  max="60"
                  step="0.5"
                  class="w-full p-2 border rounded-lg text-right"
                  value="${settings.intervalMinutes}" />
              </div>
              
              <div class="space-y-1">
                <label class="block text-right text-sm font-medium" for="backup-stop">
                  הפסק גיבוי לאחר (בדקות)
                </label>
                <input
                  id="backup-stop"
                  data-key="stopAfterMinutes"
                  data-category="backup"
                  type="number"
                  min="1"
                  max="720"
                  step="1"
                  class="w-full p-2 border rounded-lg text-right"
                  value="${settings.stopAfterMinutes}" />
              </div>
            </div>
          </form>
        </div>
      `;
    };

    // Snapshot & editable store for quick comments (NEW)
    const originalQuickComments = JSON.parse(JSON.stringify(CONFIG.CRAWLING_GROUP_COMMON_COMMENTS || { good: [], neutral: [], bad: [] }));
    let editableQuickComments = JSON.parse(JSON.stringify(originalQuickComments));

    const renderUsersPage = () => {
      // Debug: וידוא שה-USERS_CONFIG קיים
      console.log('🔍 USERS_CONFIG:', window.USERS_CONFIG);
      console.log('🔍 USERS_CONFIG.users:', window.USERS_CONFIG?.users);
      
      const users = editableUsers; // שימוש בעותק העריכה
      
      console.log('👥 מספר משתמשים למציג:', users.length);
      console.log('📋 רשימת משתמשים:', users);
      
      // קריאת הגדרת גישת משתמשים מה-localStorage
      const dsRaw = localStorage.getItem('downloadedSystemSettings');
      const dsObj = dsRaw ? JSON.parse(dsRaw) : {};
      const allowNonAdminAccess = dsObj.appAccess?.allowNonAdminUsers !== false; // ברירת מחדל: true
      
      return `
        <div class="space-y-6">
          <div class="bg-green-50 border-r-4 border-green-400 text-green-800 text-sm rounded-lg p-4">
            <strong>מידע:</strong> ניהול משתמשים מורשים להתחברות. משתמשים עם הרשאת מנהל מקבלים גישה לדשבורד.
          </div>
          
          <!-- הגדרת גישה לאפליקציה -->
          <div class="bg-white border rounded-lg shadow-sm p-6">
            <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
              🔐 הגדרות גישה לאפליקציה
            </h3>
            <div class="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
              <label class="flex items-start space-x-3 space-x-reverse cursor-pointer">
                <input type="checkbox" id="allow-non-admin-access" 
                       ${allowNonAdminAccess ? 'checked' : ''} 
                       class="mt-1 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                       data-category="users">
                <div class="flex-1">
                  <span class="text-sm font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
                    ✅ אפשר גישה למשתמשים רגילים
                  </span>
                  <p class="text-xs text-blue-700 dark:text-blue-300 mt-2">
                    כאשר מסומן: משתמשי Google רגילים (לא מנהלים) יכולים להיכנס לאפליקציה.<br>
                    כאשר לא מסומן: רק מנהלים ואורחים יכולים להיכנס לאפליקציה.
                  </p>
                  <p class="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">
                    ⚠️ שינוי זה ייכנס לתוקף מיד לאחר שמירה והעלאה לדרייב.
                  </p>
                </div>
              </label>
            </div>
          </div>
          
          <div class="bg-white border rounded-lg shadow-sm">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 border-b border-gray-200">
              <h3 class="text-xl font-semibold flex items-center gap-2">
                👥 משתמשים מורשים 
                <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">${users.length}</span>
              </h3>
              <button id="btn-add-user" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-sm font-medium">
                ➕ הוסף משתמש
              </button>
            </div>
            
            <div class="max-h-96 overflow-y-auto p-4">
              ${users.length === 0 ? renderEmptyState() : renderUsersList(users)}
            </div>
          </div>
        </div>
      `;
    };

    const renderQuickCommentsPage = () => {
      const groups = editableQuickComments; // use editable copy (NOT global CONFIG)
      const catMeta = [
        { key: 'good', label: 'חיובי', emoji: '✅', color: 'green' },
        { key: 'neutral', label: 'ניטרלי', emoji: '🟦', color: 'gray' },
        { key: 'bad', label: 'טעון שיפור', emoji: '⚠️', color: 'amber' }
      ];
      const makeCategory = (c) => {
        const arr = Array.isArray(groups[c.key]) ? groups[c.key] : [];
        const pills = arr.map((txt, idx) => `
          <span class="inline-flex items-center gap-1 bg-${c.color}-100 text-${c.color}-800 dark:bg-${c.color}-900/40 dark:text-${c.color}-200 px-3 py-1 rounded-full text-sm group" data-qc-pill data-cat="${c.key}" data-index="${idx}">
            <span class="truncate max-w-[140px]" title="${txt.replace(/&/g,'&amp;')}">${txt}</span>
            <button type="button" class="text-${c.color}-700 hover:text-red-600 dark:text-${c.color}-300 dark:hover:text-red-300 font-bold" data-remove-qc data-cat="${c.key}" data-index="${idx}" aria-label="הסר">×</button>
          </span>`).join('');
        return `
          <div class="space-y-2">
            <h4 class="font-semibold flex items-center gap-2 text-${c.color}-700 dark:text-${c.color}-300">${c.emoji} ${c.label}
              <span class="text-xs font-normal text-gray-500">(${arr.length})</span>
            </h4>
            <div class="flex flex-wrap gap-2 border rounded-lg p-3 bg-white dark:bg-gray-800 min-h-[56px]" data-qc-container="${c.key}">
              ${pills || '<span class="text-xs text-gray-400">(ריק)</span>'}
            </div>
            <div class="flex gap-2">
              <input type="text" class="flex-1 p-2 border rounded-lg text-sm" placeholder="הוסף הערה..." data-qc-input="${c.key}" />
              <button type="button" class="px-4 py-2 rounded-lg bg-${c.color}-600 hover:bg-${c.color}-700 text-white text-sm font-medium" data-action="add-qc" data-cat="${c.key}">הוסף</button>
            </div>
          </div>`;
      };
      return `
        <div class="space-y-6">
          <div class="bg-purple-50 border-r-4 border-purple-400 text-purple-800 text-sm rounded-lg p-4 dark:bg-purple-900/30 dark:text-purple-200">
            <strong>ניהול הערות מהירות:</strong> השינויים נשמרים רק בלחיצה על "שמור הכל". לחיצה על ביטול תחזיר למצב המקורי.
          </div>
          <div class="flex flex-wrap gap-3">
            <button type="button" class="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium" data-action="qc-reset-defaults">♻️ ברירת מחדל</button>
          </div>
          <div class="grid gap-6 md:grid-cols-3">
            ${catMeta.map(makeCategory).join('')}
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            * ברירת המחדל נטענת מתוך הקונפיג בתחילת הדף (לא מדרייב).
          </div>
        </div>`;
    };

    const renderEmptyState = () => {
      return `
        <div class="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
          <div class="text-3xl mb-3">📭</div>
          <h4 class="text-lg font-medium text-gray-900 mb-2">אין משתמשים מורשים</h4>
          <p class="text-gray-600 mb-4 text-sm">התחל להוסיף משתמשים</p>
        </div>
      `;
    };

    const renderUsersList = (users) => {
      return `
        <div class="space-y-3">
          ${users.map((user, index) => renderUserCard(user, index)).join('')}
        </div>
      `;
    };

    const renderUserCard = (user, index) => {
      const displayName = user.name || user.email || 'משתמש';
      
      return `
        <div class="group border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer bg-white dark:bg-gray-800" 
             onclick="editUser(${index})">
          <div class="flex items-center justify-between gap-2">
            <div class="min-w-0 flex-1">
              <div class="font-bold text-gray-900 dark:text-gray-100 text-base mb-1">${displayName}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 truncate">📧 ${user.email}</div>
            </div>
            
            <div class="flex items-center gap-1.5 flex-shrink-0">
              ${user.isAdmin ? 
                '<span class="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap">🛡️ מנהל</span>' : 
                '<span class="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded text-xs whitespace-nowrap">👤 משתמש</span>'
              }
              <button onclick="event.stopPropagation(); removeUser(${index})" 
                      class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded transition-colors" title="הסר משתמש">
                🗑️
              </button>
            </div>
          </div>
        </div>
      `;
    };

    const renderSubPage = () => {
      const contentEl = root.querySelector('#subpage-content');
      if (!contentEl) return;

      switch (currentSubPage) {
        case 'exercises':
          contentEl.innerHTML = renderExercisesPage();
          break;
        case 'backup':
          contentEl.innerHTML = renderBackupPage();
          break;
        case 'users':
          contentEl.innerHTML = renderUsersPage();
          break;
        case 'quick-comments':
          contentEl.innerHTML = renderQuickCommentsPage();
          break;
      }
    };

    const attachEventListeners = () => {
      root.addEventListener('click', (e) => {
        const navTab = e.target.closest('[data-subpage]');
        if (navTab) {
          const newPage = navTab.dataset.subpage;
          if (newPage !== currentSubPage) {
            currentSubPage = newPage;
            updateNavTabs();
            renderSubPage();
          }
        }
      });

      root.addEventListener('input', (e) => {
        const input = e.target.closest('[data-category]');
        if (!input) return;
        
        const category = input.dataset.category;
        if (category === 'exercises') exercisesDirty = true;
        else if (category === 'backup') backupDirty = true;
        else if (category === 'users') usersDirty = true;
        
        updateDirtyState();
      });

      root.addEventListener('click', (e) => {
        if (e.target.matches('#btn-add-user')) {
          addNewUser();
        }
        const resetBtn = e.target.closest('[data-action="qc-reset-defaults"]');
        if (resetBtn) {
          if (confirm('להחזיר את רשימות ההערות לברירת המחדל מהקונפיג? פעולה זו תמחק שינויים שלא נשמרו.')) {
            editableQuickComments = JSON.parse(JSON.stringify(originalQuickComments));
            quickCommentsDirty = true; // mark dirty so user must save
            if (currentSubPage === 'quick-comments') renderSubPage();
            updateDirtyState();
          }
        }
        // Add quick comment item (edit in editable copy ONLY)
        const addBtn = e.target.closest('[data-action="add-qc"]');
        if (addBtn) {
          const cat = addBtn.getAttribute('data-cat');
          const input = root.querySelector(`[data-qc-input="${cat}"]`);
          if (input && input.value.trim()) {
            const val = input.value.trim();
            const grp = editableQuickComments[cat] || (editableQuickComments[cat] = []);
            grp.push(val);
            input.value='';
            quickCommentsDirty = true;
            if (currentSubPage === 'quick-comments') renderSubPage();
            updateDirtyState();
          }
        }
        const removeBtn = e.target.closest('[data-remove-qc]');
        if (removeBtn) {
          const cat = removeBtn.getAttribute('data-cat');
          const idx = Number(removeBtn.getAttribute('data-index'));
          const arr = editableQuickComments[cat];
          if (Array.isArray(arr) && arr[idx] !== undefined) {
            arr.splice(idx,1);
            quickCommentsDirty = true;
            if (currentSubPage === 'quick-comments') renderSubPage();
            updateDirtyState();
          }
        }
      });

      root.querySelector('#btn-save-all').addEventListener('click', saveAllSettings);
      
      root.querySelector('#btn-cancel-all').addEventListener('click', () => {
        if (isDirty() && !confirm('לבטל שינויים שלא נשמרו?')) return;
        // Revert editable quick comments (discard unsaved changes)
        editableQuickComments = JSON.parse(JSON.stringify(originalQuickComments));
        quickCommentsDirty = false;
        updateDirtyState();
        if (typeof state !== 'undefined') {
          state.currentPage = state.lastPage || state.currentPage;
        }
        if (typeof render === 'function') render();
      });
    };

    const updateNavTabs = () => {
      root.querySelectorAll('.admin-nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.subpage === currentSubPage);
      });
    };

    const isDirty = () => exercisesDirty || backupDirty || usersDirty || quickCommentsDirty;

    const updateDirtyState = () => {
      const dirty = isDirty();
      const dirtyBadge = root.querySelector('#dirty-indicator');
      const saveBtn = root.querySelector('#btn-save-all');
      
      if (dirty) {
        dirtyBadge.classList.remove('hidden');
        saveBtn.disabled = false;
      } else {
        dirtyBadge.classList.add('hidden');
        saveBtn.disabled = true;
      }
    };

    const collectFormData = () => {
      const exercisesForm = root.querySelector('#exercises-form');
      if (exercisesForm && exercisesDirty) {
        exercisesForm.querySelectorAll('input[data-key]').forEach(input => {
          const key = input.dataset.key;
          if (input.type === 'number') {
            CONFIG[key] = Number(input.value);
          } else {
            CONFIG[key] = input.value.trim();
          }
        });
      }

      const backupForm = root.querySelector('#backup-form');
      if (backupForm && backupDirty) {
        backupForm.querySelectorAll('[data-key]').forEach(input => {
          const key = input.dataset.key;
          if (input.type === 'checkbox') {
            CONFIG.AUTO_BACKUP_SETTINGS[key] = input.checked;
            if (key === 'enabled') {
              CONFIG.AUTO_BACKUP_UPLOAD_ENABLED = input.checked;
            }
          } else if (input.type === 'number') {
            const value = Number(input.value);
            CONFIG.AUTO_BACKUP_SETTINGS[key] = value;
            
            if (key === 'intervalMinutes') {
              CONFIG.AUTO_BACKUP_UPLOAD_INTERVAL_MS = value * 60 * 1000;
            } else if (key === 'stopAfterMinutes') {
              CONFIG.AUTO_BACKUP_UPLOAD_MAX_DURATION_MS = value * 60 * 1000;
            }
          }
        });
      }
      // NEW: עדכון users אם נערכו
      if (usersDirty) {
        try {
          const dsRaw = localStorage.getItem('downloadedSystemSettings');
          const dsObj = dsRaw ? JSON.parse(dsRaw) : {};
          dsObj.users = editableUsers.map(u => ({ ...u, email: normalizeEmail(u.email) }));
          // גם במבנה ישן
          dsObj.userManagement = dsObj.userManagement || {};
          dsObj.userManagement.authorizedUsers = dsObj.users;
          // עדכון הגדרת גישה למשתמשים רגילים
          const allowNonAdminAccessCheckbox = root.querySelector('#allow-non-admin-access');
          if (allowNonAdminAccessCheckbox) {
            dsObj.appAccess = dsObj.appAccess || {};
            dsObj.appAccess.allowNonAdminUsers = allowNonAdminAccessCheckbox.checked;
          }
          localStorage.setItem('downloadedSystemSettings', JSON.stringify(dsObj));
          console.log('💾 users ועודכנו ב-downloadedSystemSettings (סה"כ:', dsObj.users.length, ')');
        } catch(e){ console.warn('שגיאה בעדכון downloadedSystemSettings.users', e); }
      }
      if (quickCommentsDirty) {
        try {
          const gc = editableQuickComments; // commit editable -> CONFIG
          ['good','neutral','bad'].forEach(k => {
            if (!Array.isArray(gc[k])) gc[k] = [];
            gc[k] = gc[k].map(s => String(s||'').trim()).filter(Boolean);
          });
          CONFIG.CRAWLING_GROUP_COMMON_COMMENTS = JSON.parse(JSON.stringify(gc));
          const dsRaw2 = localStorage.getItem('downloadedSystemSettings');
          const dsObj2 = dsRaw2 ? JSON.parse(dsRaw2) : {};
          dsObj2.quickComments = CONFIG.CRAWLING_GROUP_COMMON_COMMENTS;
          localStorage.setItem('downloadedSystemSettings', JSON.stringify(dsObj2));
          console.log('💾 quickComments נשמרו (commit)');
        } catch(e){ console.warn('שגיאה בעדכון quickComments', e); }
      }
    };

    const saveAllSettings = async () => {
      if (!isDirty()) return;
      
      const needsReset = exercisesDirty;
      const message = needsReset 
        ? 'שמירת הגדרות המקצים תאפס את כל נתוני הגיבוש.\n\nהאם להמשיך?'
        : 'לשמור את ההגדרות?';
        
      if (!confirm(message)) return;

      try {
        // הצגת אינדיקטור טעינה
        const saveBtn = root.querySelector('#btn-save-all');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '⏳ שומר...';
        saveBtn.disabled = true;

        // איסוף הנתונים מהטפסים
        collectFormData();
        
        // שמירה ל-localStorage
        if (typeof saveState === 'function') {
          saveState();
        }

        // העלאת גיבוי הגדרות לדרייב - תמיד!
        let driveUploadSuccess = false;
        let driveUploadMessage = '';
        
        try {
          console.log('📤 מעלה גיבוי הגדרות לדרייב...');
          
          // יצירת אובייקט הגדרות לגיבוי
          const settingsBackup = {
            timestamp: new Date().toISOString(),
            version: '1.0',
            users: editableUsers.map(u => ({ ...u, email: normalizeEmail(u.email) })), // שימוש בעותק העריכה
            backupSettings: CONFIG.AUTO_BACKUP_SETTINGS || {},
            exerciseSettings: {
              MAX_RUNNERS: CONFIG.MAX_RUNNERS,
              NUM_HEATS: CONFIG.NUM_HEATS,
              MAX_CRAWLING_SPRINTS: CONFIG.MAX_CRAWLING_SPRINTS,
              NUM_STRETCHER_HEATS: CONFIG.NUM_STRETCHER_HEATS,
              MAX_STRETCHER_CARRIERS: CONFIG.MAX_STRETCHER_CARRIERS,
              MAX_JERRICAN_CARRIERS: CONFIG.MAX_JERRICAN_CARRIERS
            },
            quickComments: editableQuickComments, // use committed editable copy
            appAccess: {
              allowNonAdminUsers: root.querySelector('#allow-non-admin-access')?.checked !== false
            }
          };

          // המרה ל-JSON
          const jsonContent = JSON.stringify(settingsBackup, null, 2);
          const blob = new Blob([jsonContent], { type: 'application/json' });
          
          // שם קובץ קבוע - השרת יחליט איפה לשמור אותו
          const fileName = 'settings-backup.json';

          // בדיקה אם Google Drive Uploader זמין
          if (typeof window.GoogleDriveUploader !== 'undefined') {
            // העלאה לדרייב - השרת יחליט על המיקום
            const uploadResult = await window.GoogleDriveUploader.upload(blob, fileName, {
              mimeType: 'application/json'
            });
            
            driveUploadSuccess = uploadResult.status === 'success';
            driveUploadMessage = uploadResult.message || 'הקובץ הועלה בהצלחה לדרייב';
            
            if (driveUploadSuccess) {
              console.log('✅ גיבוי הגדרות הועלה בהצלחה לדרייב');
            } else {
              console.warn('⚠️ העלאה לדרייב נכשלה:', driveUploadMessage);
            }
          } else {
            console.warn('⚠️ Google Drive Uploader לא זמין');
            driveUploadMessage = 'שירות Google Drive לא זמין';
          }
        } catch (uploadError) {
          console.error('❌ שגיאה בהעלאת גיבוי לדרייב:', uploadError);
          driveUploadMessage = uploadError.message || 'שגיאה לא ידועה בהעלאה';
        }

        // איפוס דגלי "dirty"
        exercisesDirty = false;
        backupDirty = false;
        usersDirty = false;
        quickCommentsDirty = false; // reset after save
        // Update original snapshot for quick comments after successful save
        editableQuickComments = JSON.parse(JSON.stringify(CONFIG.CRAWLING_GROUP_COMMON_COMMENTS || {}));

        // שחזור כפתור השמירה
        saveBtn.innerHTML = originalText;
        updateDirtyState();

        // הצגת הודעה למשתמש
        if (needsReset) {
          // במקרה של איפוס - הצג הודעה והמשך לאיפוס
          const resetMessage = driveUploadSuccess 
            ? '✅ ההגדרות נשמרו והועלו לדרייב בהצלחה!\n\nהאפליקציה תתאתחל כעת למצב התחלתי...'
            : `⚠️ ההגדרות נשמרו מקומית!\n\nאך העלאה לדרייב נכשלה:\n${driveUploadMessage}\n\nהאפליקציה תתאתחל כעת למצב התחלתי...`;
          
          alert(resetMessage);
          
          // המשך לאיפוס מלא
          if (typeof state !== 'undefined' && typeof PAGES !== 'undefined') {
            state.currentPage = PAGES.RUNNERS;
          }
          if (typeof initializeAllData === 'function') initializeAllData();
          if (typeof saveState === 'function') saveState();
          if (typeof render === 'function') render();
        } else {
          // במקרה של שמירה רגילה - הצג הודעה והישאר בדף ההגדרות
          if (driveUploadSuccess) {
            showSuccessNotification('✅ ההגדרות נשמרו והועלו לדרייב בהצלחה!');
          } else {
            showWarningNotification(`⚠️ ההגדרות נשמרו מקומית, אך העלאה לדרייב נכשלה:\n${driveUploadMessage}`);
          }
          
          // רענון התצוגה הנוכחית
          renderSubPage();
        }
        
        if (quickCommentsDirty && window.QuickComments && typeof window.QuickComments.refresh === 'function') {
          setTimeout(()=>{ try { window.QuickComments.refresh(); } catch(_){} }, 100);
        }
        
      } catch (error) {
        console.error('❌ שגיאה כללית בשמירת הגדרות:', error);
        alert('❌ שגיאה בשמירת ההגדרות:\n' + error.message);
        
        // שחזור כפתור השמירה
        const saveBtn = root.querySelector('#btn-save-all');
        if (saveBtn) {
          saveBtn.innerHTML = '💾 שמור הכל';
          saveBtn.disabled = false;
        }
      }
    };

    // פונקציות עזר להצגת התראות
    const showSuccessNotification = (message) => {
      showNotification(message, 'success');
    };

    const showWarningNotification = (message) => {
      showNotification(message, 'warning');
    };

    const showNotification = (message, type = 'success') => {
      // הסרת התראות קודמות
      const existingNotif = document.getElementById('settings-notification');
      if (existingNotif) {
        existingNotif.remove();
      }

      // יצירת התראה חדשה
      const notification = document.createElement('div');
      notification.id = 'settings-notification';
      notification.className = `fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium text-center max-w-md transition-all duration-300 ${
        type === 'success' 
          ? 'bg-green-600' 
          : type === 'warning' 
          ? 'bg-amber-600' 
          : 'bg-red-600'
      }`;
      notification.style.opacity = '0';
      notification.textContent = message;

      document.body.appendChild(notification);

      // אנימציה של הופעה
      setTimeout(() => {
        notification.style.opacity = '1';
      }, 10);

      // הסרה אוטומטית אחרי 4 שניות
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
          notification.remove();
        }, 300);
      }, 4000);
    };

    const addAdminStyles = () => {
      // REMOVED: הסרת יצירת <style> דינמי - הסגנונות כבר צריכים להיות בקובץ CSS גלובלי
      // אם אין להם קובץ ייעודי, נוסיף אותם ל-main-unified.css
    };

    renderMainLayout();
  };
})();