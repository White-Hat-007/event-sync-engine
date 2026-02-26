// ─────────────────────────────────────────────────────────
// app.js — Main application logic
// DOM manipulation, event rendering, form handling,
// real-time updates, filtering, search, and toasts
// ─────────────────────────────────────────────────────────

(() => {
    'use strict';

    // ── Auth Guard ─────────────────────────────────────────
    const _token = localStorage.getItem('eventsync_token');
    if (!_token) { window.location.replace('/login.html'); return; }

    const _user = (() => {
        try { return JSON.parse(localStorage.getItem('eventsync_user') || '{}'); } catch { return {}; }
    })();
    const _isAdmin = _user.role === 'admin';

    // Track which events this user has RSVP'd to (keyed by event id)
    const _myRsvps = new Set();

    // ── State ──────────────────────────────────────────────
    let events = [];
    let editingId = null;
    let deleteTargetId = null;

    // ── DOM References ─────────────────────────────────────
    const $ = (sel) => document.querySelector(sel);
    const eventGrid = $('#event-grid');
    const loadingState = $('#loading-state');
    const form = $('#event-form');
    const formTitle = $('#form-title');
    const btnSubmit = $('#btn-submit');
    const btnCancel = $('#btn-cancel');
    const searchInput = $('#search-input');
    const filterPriority = $('#filter-priority');
    const filterStatus = $('#filter-status');
    const syncLogList = $('#sync-log');
    const connectionStatus = $('#connection-status');
    const liveIndicator = $('#live-indicator');
    const clientCountNum = $('#client-count-number');
    const modalOverlay = $('#modal-overlay');
    const modalConfirm = $('#modal-confirm');
    const modalCancel = $('#modal-cancel');
    const modalMessage = $('#modal-message');
    const userDisplay = $('#user-display');
    const userAvatar = $('#user-avatar');
    const userNameEl = $('#user-name');
    const btnLogout = $('#btn-logout');
    const toastContainer = $('#toast-container');
    const adminFormCard = $('#admin-form-card');
    const userRoleBadge = $('#user-role-badge');

    // ── Show admin form only for admins ─────────────────────
    if (_isAdmin && adminFormCard) {
        adminFormCard.style.display = '';
    }

    // ── Populate user chip + role badge ─────────────────────
    if (_user.username) {
        if (userAvatar) { userAvatar.textContent = _user.username[0].toUpperCase(); userAvatar.style.background = _user.avatar_color || '#6C63FF'; }
        if (userNameEl) userNameEl.textContent = _user.username;
        if (userDisplay) userDisplay.style.display = 'flex';
        if (userRoleBadge) {
            userRoleBadge.textContent = _isAdmin ? 'Admin' : 'User';
            userRoleBadge.style.display = 'inline-block';
            userRoleBadge.style.background = _isAdmin ? 'rgba(108,99,255,0.2)' : 'rgba(67,233,123,0.15)';
            userRoleBadge.style.color = _isAdmin ? '#6C63FF' : '#43e97b';
            userRoleBadge.style.border = _isAdmin ? '1px solid rgba(108,99,255,0.3)' : '1px solid rgba(67,233,123,0.25)';
        }
    }

    // ── Logout ─────────────────────────────────────────────
    if (btnLogout) btnLogout.addEventListener('click', () => Auth.logout());

    // ── Admin: Users Panel ─────────────────────────────────
    const btnUsers = $('#btn-users');
    const uPanel = $('#users-panel-overlay');
    const uList = $('#users-list');
    const uSummary = $('#users-summary');
    const uSearch = $('#users-search');
    const uClose = $('#btn-close-users');
    let _allUsers = [];

    if (_isAdmin && btnUsers) {
        btnUsers.style.display = 'inline-flex';
        btnUsers.addEventListener('click', _openUsers);
    }
    if (uClose) uClose.addEventListener('click', _closeUsers);
    if (uPanel) uPanel.addEventListener('click', e => { if (e.target === uPanel) _closeUsers(); });
    if (uSearch) uSearch.addEventListener('input', () => _renderUsers(_allUsers));

    function _closeUsers() { if (uPanel) { uPanel.style.display = 'none'; if (uSearch) uSearch.value = ''; } }

    async function _openUsers() {
        if (!uPanel) return;
        uPanel.style.display = 'block';
        if (uList) uList.innerHTML = '<div style="text-align:center;padding:2.5rem;color:#64748b;"><div style="width:34px;height:34px;border:3px solid rgba(108,99,255,0.25);border-top-color:#6C63FF;border-radius:50%;animation:spin 0.9s linear infinite;margin:0 auto 0.8rem;"></div>Loading&hellip;</div>';
        if (uSummary) uSummary.innerHTML = '';
        try {
            _allUsers = await Auth.fetchAllUsers();
            _renderUsers(_allUsers);
        } catch (err) {
            if (uList) uList.innerHTML = `<p style="color:#ff5c7a;text-align:center;padding:1.5rem;">Error: ${escapeHtml(err.message)}</p>`;
        }
    }

    function _renderUsers(users) {
        if (!uList || !uSummary) return;
        const q = uSearch ? uSearch.value.toLowerCase().trim() : '';
        const shown = users.filter(u => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));

        const total = users.length, admins = users.filter(u => u.role === 'admin').length;
        const withEv = users.filter(u => u.registered_events.length > 0).length;
        uSummary.innerHTML = [
            _chip(total, 'Total Users', '#6C63FF', 'rgba(108,99,255,0.12)'),
            _chip(admins, 'Admins', '#FF6584', 'rgba(255,101,132,0.12)'),
            _chip(total - admins, 'Regular Users', '#43E97B', 'rgba(67,233,123,0.1)'),
            _chip(withEv, 'Have Event RSVPs', '#F9A826', 'rgba(249,168,38,0.1)'),
        ].join('');

        if (!shown.length) {
            uList.innerHTML = '<p style="text-align:center;color:#64748b;padding:2rem;">No users match.</p>';
            return;
        }

        uList.innerHTML = shown.map(u => {
            const isAdm = u.role === 'admin';
            const joined = new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const chips = u.registered_events.map(ev => {
                const sc = { upcoming: '#6C63FF', ongoing: '#43E97B', completed: '#64748b', cancelled: '#FF6584' }[ev.status] || '#64748b';
                const ed = new Date(ev.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return `<span style="display:inline-flex;align-items:center;gap:0.28rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:6px;padding:0.18rem 0.5rem;font-size:0.71rem;color:#cbd5e1;">
                    <span style="width:6px;height:6px;border-radius:50%;background:${sc};flex-shrink:0;"></span>
                    ${escapeHtml(ev.title)} &middot; ${ed}
                </span>`;
            }).join('');

            return `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:13px;padding:1rem 1.2rem;transition:border-color .2s,background .2s;" onmouseover="this.style.borderColor='rgba(108,99,255,0.32)';this.style.background='rgba(108,99,255,0.05)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.07)';this.style.background='rgba(255,255,255,0.03)'">
              <div style="display:flex;align-items:flex-start;gap:0.95rem;">
                <div style="width:44px;height:44px;border-radius:50%;background:${escapeHtml(u.avatar_color || '#6C63FF')};display:flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:700;color:#fff;flex-shrink:0;">${escapeHtml(u.username[0].toUpperCase())}</div>
                <div style="flex:1;min-width:0;">
                  <div style="display:flex;align-items:center;gap:0.45rem;flex-wrap:wrap;margin-bottom:0.18rem;">
                    <span style="font-weight:600;font-size:0.93rem;color:#f1f5f9;">${escapeHtml(u.username)}</span>
                    <span style="font-size:0.63rem;font-weight:700;padding:0.1rem 0.38rem;border-radius:5px;letter-spacing:.04em;text-transform:uppercase;background:${isAdm ? 'rgba(108,99,255,0.2)' : 'rgba(67,233,123,0.12)'};color:${isAdm ? '#8b83ff' : '#43e97b'};border:1px solid ${isAdm ? 'rgba(108,99,255,0.3)' : 'rgba(67,233,123,0.25)'};">${escapeHtml(u.role)}</span>
                  </div>
                  <div style="font-size:0.8rem;color:#64748b;margin-bottom:0.35rem;">${escapeHtml(u.email)}</div>
                  <div style="font-size:0.7rem;color:#475569;margin-bottom:${u.registered_events.length ? '0.5rem' : '0'};">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:10px;height:10px;vertical-align:middle;margin-right:0.2rem;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Joined ${joined}
                  </div>
                  ${u.registered_events.length
                    ? `<div style="display:flex;flex-wrap:wrap;gap:0.35rem;align-items:center;"><span style="font-size:0.68rem;color:#475569;margin-right:0.1rem;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:10px;height:10px;vertical-align:middle;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> ${u.registered_events.length} event${u.registered_events.length !== 1 ? 's' : ''}:</span>${chips}</div>`
                    : '<span style="font-size:0.7rem;color:#334155;font-style:italic;">No event registrations</span>'}
                </div>
              </div>
            </div>`;
        }).join('');
    }

    function _chip(v, label, color, bg) {
        return `<div style="background:${bg};border:1px solid ${color}30;border-radius:10px;padding:0.48rem 0.85rem;flex-shrink:0;">
            <div style="font-size:1.25rem;font-weight:800;color:${color};line-height:1;">${v}</div>
            <div style="font-size:0.68rem;color:#64748b;margin-top:0.12rem;">${label}</div>
        </div>`;
    }

    // Stats
    const statTotal = $('#stat-total');
    const statUpcoming = $('#stat-upcoming');
    const statOngoing = $('#stat-ongoing');
    const statCompleted = $('#stat-completed');

    // Form fields
    const fId = $('#event-id');
    const fTitle = $('#event-title');
    const fDescription = $('#event-description');
    const fDate = $('#event-date');
    const fTime = $('#event-time');
    const fLocation = $('#event-location');
    const fPriority = $('#event-priority');
    const fStatus = $('#event-status');

    // ── Helpers ────────────────────────────────────────────
    const formatDate = (d) => {
        const date = new Date(d);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatTime = (t) => {
        const [h, m] = t.split(':');
        const hour = parseInt(h, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        return `${hour % 12 || 12}:${m} ${ampm}`;
    };

    const escapeHtml = (str) => {
        if (!str) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return str.replace(/[&<>"']/g, c => map[c]);
    };

    // ── Toast Notification ─────────────────────────────────
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('removing');
            toast.addEventListener('animationend', () => toast.remove());
        }, 3500);
    }

    // ── Stats Update ───────────────────────────────────────
    function updateStats() {
        statTotal.textContent = events.length;
        statUpcoming.textContent = events.filter(e => e.status === 'upcoming').length;
        statOngoing.textContent = events.filter(e => e.status === 'ongoing').length;
        statCompleted.textContent = events.filter(e => e.status === 'completed').length;
    }

    // ── Filter & Search ────────────────────────────────────
    function getFilteredEvents() {
        const query = searchInput.value.toLowerCase().trim();
        const priority = filterPriority.value;
        const status = filterStatus.value;

        return events.filter(ev => {
            const matchSearch = !query || ev.title.toLowerCase().includes(query) ||
                (ev.description && ev.description.toLowerCase().includes(query)) ||
                (ev.location && ev.location.toLowerCase().includes(query));
            const matchPriority = !priority || ev.priority === priority;
            const matchStatus = !status || ev.status === status;
            return matchSearch && matchPriority && matchStatus;
        });
    }

    // ── Render Event Cards ─────────────────────────────────
    function renderEvents(flashId = null) {
        const filtered = getFilteredEvents();
        loadingState.style.display = 'none';

        if (filtered.length === 0) {
            eventGrid.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <p>${_isAdmin ? 'No events found. Create one using the form!' : 'No events available yet.'}</p>
        </div>`;
            updateStats();
            return;
        }

        eventGrid.innerHTML = filtered.map((ev, i) => {
            const isRsvpd = _myRsvps.has(ev.id);
            const canRsvp = !_isAdmin && (ev.status === 'upcoming' || ev.status === 'ongoing');
            const participantCount = ev.participant_count || 0;

            return `
      <div class="event-card priority-${escapeHtml(ev.priority)} ${flashId === ev.id ? 'flash' : ''}"
           data-id="${ev.id}" style="animation-delay: ${i * 0.04}s">
        <div class="event-card-header">
          <h3 class="event-card-title">${escapeHtml(ev.title)}</h3>
          <span class="badge badge-${escapeHtml(ev.status)}">${escapeHtml(ev.status)}</span>
        </div>
        ${ev.description ? `<p class="event-card-description">${escapeHtml(ev.description)}</p>` : ''}
        <div class="event-card-meta">
          <span class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${formatDate(ev.event_date)}
          </span>
          <span class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${formatTime(ev.event_time)}
          </span>
          ${ev.location ? `
          <span class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${escapeHtml(ev.location)}
          </span>` : ''}
          <span class="badge badge-${escapeHtml(ev.priority)}">${escapeHtml(ev.priority)}</span>
        </div>
        <div class="event-card-footer">
          <div class="event-card-creator">
            <span class="avatar-dot" style="background:${escapeHtml(ev.avatar_color || '#6C63FF')}">${escapeHtml((ev.creator_name || 'U')[0].toUpperCase())}</span>
            ${escapeHtml(ev.creator_name || 'Unknown')}
          </div>
          <div class="event-card-actions">
            ${participantCount > 0 ? `<span class="participant-count" title="${participantCount} registered">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              ${participantCount}
            </span>` : ''}
            ${canRsvp ? `
            <button class="btn btn-sm ${isRsvpd ? 'btn-rsvpd btn-cancel-rsvp' : 'btn-rsvp'}" data-id="${ev.id}" title="${isRsvpd ? 'Cancel registration' : 'Register for this event'}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px">
                ${isRsvpd ? '<polyline points="20 6 9 17 4 12"/>' : '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>'}
              </svg>
              <span>${isRsvpd ? 'Registered' : 'Register'}</span>
            </button>` : ''}
            ${_isAdmin ? `
            <button class="btn btn-ghost btn-sm btn-edit" data-id="${ev.id}" title="Edit event">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn-ghost btn-sm btn-delete" data-id="${ev.id}" title="Delete event">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>` : ''}
          </div>
        </div>
      </div>
    `}).join('');

        updateStats();
    }

    // ── Sync Log Rendering ─────────────────────────────────
    function addSyncLogEntry(action, title) {
        const empty = syncLogList.querySelector('.sync-log-empty');
        if (empty) empty.remove();

        const li = document.createElement('li');
        const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        li.innerHTML = `<span class="sync-action ${escapeHtml(action)}">${escapeHtml(action)}</span>
                    <span>${escapeHtml(title)}</span>
                    <span style="margin-left:auto;color:var(--text-muted);font-size:0.7rem">${time}</span>`;
        syncLogList.prepend(li);

        while (syncLogList.children.length > 15) {
            syncLogList.lastChild.remove();
        }
    }

    // ── Load Sync Log from Server ──────────────────────────
    async function loadSyncLog() {
        try {
            const logs = await Api.fetchSyncLog();
            if (logs.length === 0) return;
            syncLogList.innerHTML = '';
            logs.slice(0, 15).forEach(log => {
                const li = document.createElement('li');
                const data = typeof log.changed_data === 'string' ? JSON.parse(log.changed_data) : log.changed_data;
                const title = (data && data.title) || `Event #${log.event_id || '?'}`;
                const time = new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                li.innerHTML = `<span class="sync-action ${escapeHtml(log.action)}">${escapeHtml(log.action)}</span>
                        <span>${escapeHtml(title)}</span>
                        <span style="margin-left:auto;color:var(--text-muted);font-size:0.7rem">${time}</span>`;
                syncLogList.appendChild(li);
            });
        } catch (err) {
            console.error('Failed to load sync log:', err);
        }
    }

    // ── Load My RSVPs ──────────────────────────────────────
    async function loadMyRsvps() {
        _myRsvps.clear();
        for (const ev of events) {
            try {
                const participants = await Api.fetchParticipants(ev.id);
                if (participants.some(p => p.id === _user.id)) {
                    _myRsvps.add(ev.id);
                }
            } catch { /* ignore */ }
        }
    }

    // ── Form: Populate for Edit (admin only) ───────────────
    function populateForm(ev) {
        if (!_isAdmin) return;
        editingId = ev.id;
        fId.value = ev.id;
        fTitle.value = ev.title;
        fDescription.value = ev.description || '';
        fDate.value = ev.event_date.split('T')[0];
        fTime.value = ev.event_time;
        fLocation.value = ev.location || '';
        fPriority.value = ev.priority;
        fStatus.value = ev.status;

        formTitle.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      Edit Event`;
        btnSubmit.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
      Update Event`;
        btnCancel.style.display = 'inline-flex';
        fTitle.focus();
    }

    // ── Form: Reset ────────────────────────────────────────
    function resetForm() {
        editingId = null;
        if (form) form.reset();
        if (fId) fId.value = '';
        if (formTitle) formTitle.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Create Event`;
        if (btnSubmit) btnSubmit.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
      Create Event`;
        if (btnCancel) btnCancel.style.display = 'none';
    }

    // ── Form Submit (admin only) ───────────────────────────
    if (_isAdmin && form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                title: fTitle.value.trim(),
                description: fDescription.value.trim(),
                event_date: fDate.value,
                event_time: fTime.value,
                location: fLocation.value.trim(),
                priority: fPriority.value,
                status: fStatus.value
            };

            try {
                if (editingId) {
                    await Api.updateEvent(editingId, data);
                    showToast(`"${data.title}" updated successfully`, 'success');
                } else {
                    await Api.createEvent(data);
                    showToast(`"${data.title}" created successfully`, 'success');
                }
                resetForm();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    if (btnCancel) btnCancel.addEventListener('click', resetForm);

    // ── Event Grid Click Delegation ────────────────────────
    eventGrid.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.btn-edit');
        const deleteBtn = e.target.closest('.btn-delete');
        const rsvpBtn = e.target.closest('.btn-rsvp');
        const cancelRsvpBtn = e.target.closest('.btn-cancel-rsvp');

        if (editBtn && _isAdmin) {
            const id = parseInt(editBtn.dataset.id, 10);
            const ev = events.find(x => x.id === id);
            if (ev) populateForm(ev);
        }

        if (deleteBtn && _isAdmin) {
            deleteTargetId = parseInt(deleteBtn.dataset.id, 10);
            const ev = events.find(x => x.id === deleteTargetId);
            modalMessage.textContent = `Delete "${ev ? ev.title : 'this event'}"? This cannot be undone.`;
            modalOverlay.style.display = 'grid';
        }

        if (rsvpBtn) {
            const id = parseInt(rsvpBtn.dataset.id, 10);
            rsvpBtn.disabled = true;
            try {
                await Api.rsvpEvent(id);
                _myRsvps.add(id);
                // Update participant count locally
                const ev = events.find(x => x.id === id);
                if (ev) ev.participant_count = (ev.participant_count || 0) + 1;
                renderEvents();
                showToast('Registered for the event!', 'success');
            } catch (err) {
                showToast(err.message, 'error');
            }
            rsvpBtn.disabled = false;
        }

        if (cancelRsvpBtn) {
            const id = parseInt(cancelRsvpBtn.dataset.id, 10);
            cancelRsvpBtn.disabled = true;
            try {
                await Api.cancelRsvp(id);
                _myRsvps.delete(id);
                const ev = events.find(x => x.id === id);
                if (ev) ev.participant_count = Math.max(0, (ev.participant_count || 1) - 1);
                renderEvents();
                showToast('Registration cancelled.', 'warning');
            } catch (err) {
                showToast(err.message, 'error');
            }
            cancelRsvpBtn.disabled = false;
        }
    });

    // ── Delete Confirmation Modal (admin only) ─────────────
    modalConfirm.addEventListener('click', async () => {
        if (deleteTargetId === null || !_isAdmin) return;
        try {
            await Api.deleteEvent(deleteTargetId);
            showToast('Event deleted', 'warning');
        } catch (err) {
            showToast(err.message, 'error');
        }
        deleteTargetId = null;
        modalOverlay.style.display = 'none';
    });

    modalCancel.addEventListener('click', () => {
        deleteTargetId = null;
        modalOverlay.style.display = 'none';
    });

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            deleteTargetId = null;
            modalOverlay.style.display = 'none';
        }
    });

    // ── Search & Filter Listeners ──────────────────────────
    searchInput.addEventListener('input', () => renderEvents());
    filterPriority.addEventListener('change', () => renderEvents());
    filterStatus.addEventListener('change', () => renderEvents());

    // ─────────────────────────────────────────────────────── 
    // REAL-TIME SOCKET LISTENERS
    // ─────────────────────────────────────────────────────── 
    SyncSocket.on('statusChange', ({ connected }) => {
        connectionStatus.textContent = connected ? 'Live' : 'Reconnecting…';
        liveIndicator.classList.toggle('connected', connected);
    });

    SyncSocket.on('clientCount', ({ count }) => {
        clientCountNum.textContent = count;
    });

    SyncSocket.on('fullSync', (data) => {
        events = data;
        renderEvents();
        loadSyncLog();
    });

    SyncSocket.on('eventCreated', (event) => {
        if (!events.find(e => e.id === event.id)) {
            events.push(event);
        }
        renderEvents(event.id);
        addSyncLogEntry('CREATE', event.title);
        showToast(`New event: "${event.title}"`, 'info');
    });

    SyncSocket.on('eventUpdated', (event) => {
        const idx = events.findIndex(e => e.id === event.id);
        if (idx !== -1) events[idx] = event;
        else events.push(event);
        renderEvents(event.id);
        addSyncLogEntry('UPDATE', event.title);
    });

    SyncSocket.on('eventDeleted', ({ id }) => {
        const removed = events.find(e => e.id === id);
        events = events.filter(e => e.id !== id);
        _myRsvps.delete(id);
        renderEvents();
        addSyncLogEntry('DELETE', removed ? removed.title : `Event #${id}`);
        if (editingId === id) resetForm();
    });

    SyncSocket.on('rsvpUpdate', ({ eventId, participants }) => {
        const ev = events.find(e => e.id === eventId);
        if (ev) ev.participant_count = participants.length;
        // Update own RSVP status
        if (participants.some(p => p.id === _user.id)) {
            _myRsvps.add(eventId);
        } else {
            _myRsvps.delete(eventId);
        }
        renderEvents();
    });

    // ── Initial Load ───────────────────────────────────────
    (async () => {
        try {
            events = await Api.fetchEvents();
            // Load RSVP status for this user (non-admin only)
            if (!_isAdmin && _user.id) {
                await loadMyRsvps();
            }
            renderEvents();
            loadSyncLog();
        } catch (err) {
            loadingState.innerHTML = `<p style="color:var(--danger)">Failed to load events. Is the server running?</p>`;
            console.error(err);
        }
    })();

})();
