document.addEventListener('DOMContentLoaded', () => {
    const BASE = 'http://localhost:3000';
    let pollInterval = null;
    let scoreTrendChart = null;
    let scoreTrendData = [];

    // ---------- TOAST ----------
    function showToast(type, title, msg, duration = 4000) {
        const tc = document.getElementById('toast-container');
        const t  = document.createElement('div');
        t.className = `toast toast-${type}`;
        t.innerHTML = `<div class="toast-body"><span class="toast-title">${title}</span><span>${msg}</span></div>`;
        tc.appendChild(t);
        setTimeout(() => { t.classList.add('fadeOut'); t.addEventListener('animationend', () => t.remove()); }, duration);
    }

    // ---------- LOGIN ----------
    document.getElementById('btn-login').addEventListener('click', async () => {
        const pwd = document.getElementById('parent-pwd').value;
        try {
            const res  = await fetch(`${BASE}/api/parent/login`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pwd })
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById('view-login').style.display     = 'none';
                document.getElementById('view-dashboard').style.display = 'flex';
                document.querySelector('.parent-container').style.alignItems = 'flex-start';
                startPolling();
                initScoreTrendChart();
                loadDailyLimit();
            } else {
                showToast('danger', 'Login Failed', 'Incorrect password. Try "admin123".');
            }
        } catch(e) {
            showToast('danger', 'Offline', 'Backend server not running. Start with: node server.js');
        }
    });

    document.getElementById('parent-pwd').addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('btn-login').click();
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
        clearInterval(pollInterval);
        document.getElementById('view-dashboard').style.display = 'none';
        document.getElementById('view-login').style.display     = 'flex';
        document.querySelector('.parent-container').style.alignItems = 'center';
    });

    // ---------- TAB NAVIGATION ----------
    document.querySelectorAll('.p-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.p-nav-item').forEach(n => n.classList.remove('active'));
            document.querySelectorAll('.p-tab').forEach(t => t.style.display = 'none');
            item.classList.add('active');
            const tab = document.getElementById(`tab-${item.dataset.tab}`);
            if (tab) tab.style.display = 'flex';
            tab.style.flexDirection = 'column';
            tab.style.gap = '18px';
        });
    });

    // ---------- SCORE TREND CHART ----------
    function initScoreTrendChart() {
        const ctx = document.getElementById('scoreTrendChart').getContext('2d');
        scoreTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Addiction Score',
                    data: [],
                    borderColor: '#6c5ce7',
                    backgroundColor: 'rgba(108,92,231,0.1)',
                    borderWidth: 2.5,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointBackgroundColor: '#6c5ce7'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    y: { min:0, max:100, grid:{ color:'rgba(255,255,255,0.05)' }, ticks:{ color:'#a0a5b5' } },
                    x: { grid:{ display:false }, ticks:{ color:'#a0a5b5', maxTicksLimit:8 } }
                },
                plugins: { legend:{ display:false } },
                animation: { duration:400 }
            }
        });
    }

    // ---------- POLLING ----------
    function startPolling() {
        fetchStatus();
        pollInterval = setInterval(fetchStatus, 5000);
    }

    async function fetchStatus() {
        try {
            const res  = await fetch(`${BASE}/api/parent/status`);
            const data = await res.json();
            updateDashboard(data);
        } catch(e) {
            showToast('danger', 'Connection Lost', 'Cannot reach backend.');
            clearInterval(pollInterval);
        }
    }

    function updateDashboard(data) {
        const score  = data.score  || 0;
        const status = data.status || 'Unknown';
        const apps   = data.topApps || [];
        const history = data.history || [];

        // Sidebar score ring
        document.getElementById('live-score').textContent = score;
        document.getElementById('o-score').textContent    = score;
        document.getElementById('o-status').textContent   = status;
        document.getElementById('o-apps').textContent     = apps[0] || '—';

        const ring = document.getElementById('p-score-ring');
        ring.setAttribute('stroke-dasharray', `${score}, 100`);
        const stateEl = document.getElementById('live-state');
        stateEl.textContent = status;
        stateEl.className   = 'state-badge';
        if (status === 'Healthy')  { ring.style.stroke = 'var(--success)'; stateEl.classList.add('badge-healthy'); }
        else if (status === 'Moderate') { ring.style.stroke = 'var(--warn)'; stateEl.classList.add('badge-moderate'); }
        else if (status === 'Risk')     { ring.style.stroke = 'var(--danger)'; stateEl.classList.add('badge-risk'); }

        // Score trend
        if (scoreTrendChart) {
            const now = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
            scoreTrendData.push({ x: now, y: score });
            if (scoreTrendData.length > 20) scoreTrendData.shift();
            scoreTrendChart.data.labels            = scoreTrendData.map(p => p.x);
            scoreTrendChart.data.datasets[0].data  = scoreTrendData.map(p => p.y);
            scoreTrendChart.update();
        }

        // App list
        const appListEl = document.getElementById('app-list');
        if (apps.length > 0) {
            const dangerApps = ['TikTok', 'Instagram', 'Discord', 'YouTube', 'Snapchat'];
            appListEl.innerHTML = apps.map(a => {
                const isDanger = dangerApps.includes(a);
                return `<li class="app-list-item">
                    <span class="app-name">
                        <i class="fa-solid fa-${isDanger ? 'triangle-exclamation app-badge-danger' : 'circle-check app-badge-safe'}"></i>
                        ${a}
                    </span>
                    <span style="font-size:0.75rem; color:var(--text-muted)">${isDanger ? '⚠️ High-risk' : '✅ Safe'}</span>
                </li>`;
            }).join('');
        }

        // History table
        if (history.length > 0) {
            const tbody = document.getElementById('history-body');
            tbody.innerHTML = history.slice().reverse().map(s => {
                const d   = new Date(s.timestamp || Date.now());
                const time = d.toLocaleString('en-IN', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
                const pillClass = s.status === 'Healthy' ? 'pill-healthy' : s.status === 'Moderate' ? 'pill-moderate' : 'pill-risk';
                const appNames = (s.sessions || []).map(x => x.appName).slice(0,3).join(', ') || '—';
                return `<tr>
                    <td>${time}</td>
                    <td>${appNames}</td>
                    <td>${s.score || '—'}</td>
                    <td><span class="status-pill ${pillClass}">${s.status || '—'}</span></td>
                </tr>`;
            }).join('');
        }
    }

    // ---------- HARD LOCK ----------
    document.getElementById('btn-lock').addEventListener('click', async () => {
        if (!confirm('⚠️ This will immediately lock the child\'s Windows session. Continue?')) return;
        try {
            const res  = await fetch(`${BASE}/api/parent/lock`, { method: 'POST' });
            const data = await res.json();
            if (data.success) showToast('success', 'Device Locked', 'Child\'s session has been remotely locked.');
            else               showToast('danger', 'Lock Failed', 'Could not lock the device.');
        } catch(e) {
            showToast('danger', 'Error', 'Backend unreachable.');
        }
    });

    // ---------- BREAK REMINDER ----------
    document.getElementById('btn-remind').addEventListener('click', async () => {
        const msg = document.getElementById('reminder-msg').value.trim() || 'Time to take a break!';
        try {
            await fetch(`${BASE}/api/parent/remind`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg })
            });
            showToast('success', 'Reminder Sent', 'A notification will appear on the child\'s screen.');
            document.getElementById('reminder-msg').value = '';
        } catch(e) {
            showToast('danger', 'Error', 'Could not send reminder.');
        }
    });

    // ---------- DAILY LIMIT ----------
    async function loadDailyLimit() {
        try {
            const res  = await fetch(`${BASE}/api/parent/daily-limit`);
            const data = await res.json();
            document.getElementById('current-limit-display').textContent = data.limit;
            document.getElementById('daily-limit-input').value = data.limit;
        } catch(_) {}
    }

    document.getElementById('btn-set-limit').addEventListener('click', async () => {
        const val = parseInt(document.getElementById('daily-limit-input').value);
        if (!val || val < 10) { showToast('warn', 'Invalid', 'Please enter at least 10 minutes.'); return; }
        try {
            const res  = await fetch(`${BASE}/api/parent/daily-limit`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ limit: val })
            });
            const data = await res.json();
            document.getElementById('current-limit-display').textContent = data.limit;
            showToast('success', 'Limit Updated', `Daily screen time limit set to ${data.limit} minutes.`);
        } catch(e) {
            showToast('danger', 'Error', 'Could not update limit.');
        }
    });
});
