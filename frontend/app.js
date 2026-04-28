document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000/api/analyze-behavior';
    let chartInstance = null;
    let lockCountdown = null;
    let interventionCount = 0;

    // ---------- ELEMENTS ----------
    const uiScoreCircle = document.getElementById('score-ring');
    const uiScoreText   = document.getElementById('score-text');
    const uiStatusBadge = document.getElementById('status-text');
    const uiScoreHint   = document.getElementById('score-hint');
    const focusOverlay  = document.getElementById('focus-overlay');
    const lockTimerEl   = document.getElementById('lock-timer');
    const btnDismiss    = document.getElementById('btn-dismiss-focus');
    const logList       = document.getElementById('detection-log');
    const toastContainer = document.getElementById('toast-container');

    // Stat card elements
    const statScreenTime   = document.getElementById('stat-screen-time');
    const statSessions     = document.getElementById('stat-sessions');
    const statLongest      = document.getElementById('stat-longest');
    const statInterventions = document.getElementById('stat-interventions');

    // ---------- LIVE CLOCK ----------
    function updateClock() {
        const now = new Date();
        document.getElementById('live-clock').textContent = now.toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit', second: '2-digit'});
    }
    updateClock();
    setInterval(updateClock, 1000);

    // ---------- CHART ----------
    function initChart() {
        const ctx = document.getElementById('usageChart').getContext('2d');
        Chart.defaults.color = '#a0a5b5';
        Chart.defaults.font.family = "'Outfit', sans-serif";
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Educational', 'News', 'Social Media', 'Entertainment'],
                datasets: [{
                    label: 'Minutes Used',
                    data: [0, 0, 0, 0],
                    backgroundColor: [
                        'rgba(0, 206, 201, 0.6)',
                        'rgba(108, 92, 231, 0.6)',
                        'rgba(255, 118, 117, 0.6)',
                        'rgba(253, 203, 110, 0.6)'
                    ],
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 800, easing: 'easeInOutQuart' },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { stepSize: 10 } },
                    x: { grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }
    initChart();

    // ---------- TOAST NOTIFICATIONS ----------
    function showToast(type, title, message, duration = 4500) {
        const icons = { warn: 'fa-triangle-exclamation', danger: 'fa-biohazard', success: 'fa-circle-check', info: 'fa-info-circle' };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fa-solid ${icons[type] || icons.info}"></i>
            <div class="toast-body">
                <span class="toast-title">${title}</span>
                <span class="toast-msg">${message}</span>
            </div>`;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('fadeOut');
            toast.addEventListener('animationend', () => toast.remove());
        }, duration);
    }

    // ---------- DETECTION LOG ----------
    function addLog(type, message) {
        const icons = { info: 'fa-info-circle', success: 'fa-check-circle', warn: 'fa-clock', danger: 'fa-skull-crossbones' };
        const item = document.createElement('li');
        item.className = `log-item log-${type}`;
        const time = new Date().toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit', second: '2-digit'});
        item.innerHTML = `<i class="fa-solid ${icons[type]}"></i> <span>[${time}] ${message}</span>`;
        // Keep log trimmed to last 5 entries
        if (logList.children.length >= 5) logList.removeChild(logList.firstChild);
        logList.appendChild(item);
    }

    // ---------- DATA PAYLOADS ----------
    const scenarios = {
        healthy: {
            sessions: [
                { appName: 'Khan Academy', duration: 35 },
                { appName: 'BBC News',     duration: 10 },
                { appName: 'Instagram',    duration: 5 }
            ],
            chartData: [35, 10, 5, 0],
            label: 'Healthy Usage Simulation'
        },
        moderate: {
            sessions: [
                { appName: 'Twitter',      duration: 12 },
                { appName: 'YouTube',      duration: 28 },
                { appName: 'News',         duration: 22 }
            ],
            chartData: [0, 22, 12, 28],
            label: 'Moderate Usage Simulation'
        },
        doom: {
            sessions: [
                { appName: 'Wikipedia',  duration: 2 },
                { appName: 'TikTok',     duration: 22 },
                { appName: 'Instagram',  duration: 18 }
            ],
            chartData: [2, 0, 40, 0],
            label: 'Doom-Scroll Simulation'
        }
    };

    // ---------- STAT CARD UPDATER ----------
    function updateStatCards(sessions) {
        const totalTime = sessions.reduce((sum, s) => sum + s.duration, 0);
        const longestSession = Math.max(...sessions.map(s => s.duration));
        statScreenTime.textContent = `${totalTime}m`;
        statSessions.textContent = sessions.length;
        statLongest.textContent = `${longestSession}m`;
        statInterventions.textContent = interventionCount;
    }

    // ---------- MAIN UI UPDATE ----------
    function updateUI(data, scenario) {
        const { sessions, chartData } = scenario;

        // Update chart
        chartInstance.data.datasets[0].data = chartData;
        chartInstance.update();

        // Update stat cards
        updateStatCards(sessions);

        // Update score ring
        const score = data.addictionScore;
        uiScoreText.textContent = score;
        uiScoreCircle.setAttribute('stroke-dasharray', `${score}, 100`);
        uiStatusBadge.textContent = data.status;
        uiStatusBadge.className = 'status-badge';

        if (data.status === 'Healthy') {
            uiScoreCircle.style.stroke = 'var(--success)';
            uiStatusBadge.classList.add('status-healthy');
            uiScoreHint.textContent = 'Great job! Your habits look healthy.';
            addLog('success', 'Behavior analysis complete — Status: Healthy. No threats detected.');
            showToast('success', 'All Clear', 'Your usage habits are in a healthy range!');
        } else if (data.status === 'Moderate') {
            uiScoreCircle.style.stroke = '#fdcb6e';
            uiStatusBadge.classList.add('status-moderate');
            uiScoreHint.textContent = 'Moderate usage detected. Be mindful.';
            addLog('warn', `Moderate usage flagged — Total time: ${sessions.reduce((a,s) => a+s.duration,0)}m. Consider a break.`);
            showToast('warn', 'Heads Up!', data.intervention?.message || 'You are approaching your daily limit. Consider a 5-min break.');
        } else if (data.status === 'Risk') {
            uiScoreCircle.style.stroke = 'var(--danger)';
            uiStatusBadge.classList.add('status-risk');
            uiScoreHint.textContent = 'Doom-scrolling detected! Intervention triggered.';
            addLog('danger', 'DOOM-SCROLL DETECTED — Hard intervention triggered. Session locked.');
            triggerFocusRoom(data.intervention);
        }
    }

    // ---------- API CALL ----------
    async function runSimulation(scenarioKey) {
        const scenario = scenarios[scenarioKey];
        addLog('info', `Running simulation: "${scenario.label}"...`);
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessions: scenario.sessions })
            });
            const data = await response.json();
            updateUI(data, scenario);
        } catch (error) {
            addLog('danger', 'Backend is offline! Please run: cd backend && node server.js');
            showToast('danger', 'Backend Offline', "Run 'node server.js' in the backend folder to connect the AI engine.");
        }
    }

    // ---------- BUTTON LISTENERS ----------
    document.getElementById('btn-simulate-healthy').addEventListener('click', () => runSimulation('healthy'));
    document.getElementById('btn-simulate-moderate').addEventListener('click', () => runSimulation('moderate'));
    document.getElementById('btn-simulate-doom').addEventListener('click', () => runSimulation('doom'));

    // ---------- FOCUS ROOM ----------
    function triggerFocusRoom(intervention) {
        interventionCount++;
        statInterventions.textContent = interventionCount;
        focusOverlay.classList.remove('hidden');
        document.getElementById('intervention-msg').textContent = intervention?.message || 'You have been doom-scrolling. Take a breath.';
        document.getElementById('exercise-name').textContent = intervention?.suggestedExercise || 'Box Breathing (4-4-4-4)';

        btnDismiss.disabled = true;
        btnDismiss.innerHTML = `<i class="fa-solid fa-lock"></i> Unlocking in <span id="lock-timer">15</span>s`;
        let timeLeft = 15;
        const breatheEl = document.getElementById('breathe-text');

        if (lockCountdown) clearInterval(lockCountdown);
        lockCountdown = setInterval(() => {
            timeLeft--;
            const timerSpan = document.getElementById('lock-timer');
            if (timerSpan) timerSpan.textContent = timeLeft;
            breatheEl.textContent = (timeLeft % 8 > 4) ? 'Inhale' : 'Exhale';
            if (timeLeft <= 0) {
                clearInterval(lockCountdown);
                btnDismiss.disabled = false;
                btnDismiss.innerHTML = `<i class="fa-solid fa-unlock"></i> I'm mindful now — Unlock`;
            }
        }, 1000);
    }

    btnDismiss.addEventListener('click', () => {
        focusOverlay.classList.add('hidden');
        runSimulation('healthy');
    });
});
