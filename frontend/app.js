document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000/api/analyze-behavior';
    let chartInstance = null;
    let lockCountdown = null;
    let interventionCount = 0;

    // ---------- SETTINGS (loaded from localStorage) ----------
    let guardianEmail    = localStorage.getItem('ng_guardian_email') || '';
    let sensitivity      = localStorage.getItem('ng_sensitivity')    || 'balanced';
    let prodMultiplier   = localStorage.getItem('ng_prod_mult') !== 'false';
    let soundEnabled     = localStorage.getItem('ng_sound')      !== 'false';
    let geminiKey        = localStorage.getItem('ng_gemini_key') || '';

    // ---------- COGNITIVE LOAD STATE ----------
    let switchTimestamps = []; // rolling window of switch times
    const COG_WINDOW_MS  = 5 * 60 * 1000; // 5-min window

    // ---------- ELEMENTS ----------
    const uiScoreCircle = document.getElementById('score-ring');
    const uiScoreText = document.getElementById('score-text');
    const uiStatusBadge = document.getElementById('status-text');
    const uiScoreHint = document.getElementById('score-hint');
    const focusOverlay = document.getElementById('focus-overlay');
    const lockTimerEl = document.getElementById('lock-timer');
    const btnDismiss = document.getElementById('btn-dismiss-focus');
    const logList = document.getElementById('detection-log');
    const toastContainer = document.getElementById('toast-container');

    // Stat card elements
    const statScreenTime = document.getElementById('stat-screen-time');
    const statSessions = document.getElementById('stat-sessions');
    const statLongest = document.getElementById('stat-longest');
    const statInterventions = document.getElementById('stat-interventions');

    // ---------- LIVE CLOCK ----------
    function updateClock() {
        const now = new Date();
        document.getElementById('live-clock').textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    updateClock();
    setInterval(updateClock, 1000);

    // ---------- NATIVE OS LIVE TRACKING ENGINE ----------
    // Polls the Node.js backend to get the actual Foreground Window of the Operating System
    const OS_API_URL = 'http://localhost:3000/api/active-window';
    let isTracking = false;
    let trackingStart = null;
    let sessionTimerInt = null;
    let osPolyTimerInt = null;
    let currentApp = null;
    let currentAppStart = null;
    let accumulatedSessions = {}; // Stores { 'appName': totalMinutes }
    let lastSwitchTime = Date.now();
    let focusQualityScore = 100;
    
    // Tier 3 Productivity Whitelist
    const PRODUCTIVE_APPS = ['Visual Studio Code', 'Slack', 'Microsoft Word', 'Notion', 'Figma', 'Excel', 'Teams'];

    // Default apps recognized by NeuroGuard rule engine
    const APP_MAPPINGS = {
        'chrome': 'Google Chrome',
        'msedge': 'Microsoft Edge',
        'code': 'Visual Studio Code',
        'discord': 'Discord',
        'spotify': 'Spotify',
        'slack': 'Slack',
        'ApplicationFrameHost': 'Windows Native App',
        'Teams': 'Microsoft Teams'
    };

    const trackingBar = document.getElementById('live-tracking-bar');
    const trackingDot = document.getElementById('tracking-dot');
    const trackingLabel = document.getElementById('tracking-label');
    const liveTimerEl = document.getElementById('live-timer');
    const awayCountEl = document.getElementById('away-count'); // We'll repurpose this for App Switches
    const awayIndicator = document.getElementById('away-indicator');
    const awayLabelEl = document.getElementById('away-label');
    const btnStart = document.getElementById('btn-start-tracking');
    const btnStop = document.getElementById('btn-stop-tracking');

    let appSwitchCount = 0;

    function formatTime(ms) {
        const totalSec = Math.floor(ms / 1000);
        const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
        const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
        const s = String(totalSec % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    function startTracking() {
        isTracking = true;
        trackingStart = Date.now();
        accumulatedSessions = {};
        appSwitchCount = 0;
        currentApp = null;

        // Update UI to tracking state
        trackingDot.className = 'tracking-dot tracking';
        trackingLabel.textContent = 'Native OS Tracking: ON';
        trackingBar.classList.add('active');
        btnStart.style.display = 'none';
        btnStop.style.display = 'inline-flex';
        awayCountEl.textContent = '0';
        awayIndicator.style.display = 'none';

        addLog('success', 'Native OS Tracker started. Ping to Windows Kernel active.');
        showToast('success', 'OS Tracking Active', 'NeuroGuard is now monitoring your system processes.');

        // Update session elapsed timer every second
        sessionTimerInt = setInterval(() => {
            const elapsed = Date.now() - trackingStart;
            liveTimerEl.textContent = formatTime(elapsed);
        }, 1000);

        // Fetch OS Active Window every 2 seconds
        osPolyTimerInt = setInterval(fetchActiveWindow, 2000);
    }

    async function fetchActiveWindow() {
        if (!isTracking) return;
        try {
            const res = await fetch(OS_API_URL);
            const data = await res.json();

            let appName = data.appName;
            if (APP_MAPPINGS[appName.toLowerCase()]) {
                appName = APP_MAPPINGS[appName.toLowerCase()];
            } else {
                // Capitalize first letter
                appName = appName.charAt(0).toUpperCase() + appName.slice(1);
            }

            handleAppChange(appName, data.title);
            updateLiveTopAppsChart();
            checkLiveIntervention(appName, data.title);
        } catch (e) {
            console.error("OS Tracker Error:", e);
        }
    }

    // ---------- REAL-TIME DOOM DETECTION ----------
    function checkLiveIntervention(appName, windowTitle) {
        if (!isTracking) return;

        const distractingApps = ['Instagram', 'TikTok', 'Discord', 'YouTube', 'Twitter', 'Facebook'];
        const isDistracting = distractingApps.includes(appName) || 
                             windowTitle.toLowerCase().includes('reel') || 
                             windowTitle.toLowerCase().includes('short');

        if (isDistracting && currentAppStart) {
            const spentMs = Date.now() - currentAppStart;
            const spentMins = spentMs / 60000;

            // AUTO-TRIGGER: If user spends over 10 continuous minutes on a distracting app
            const DOOM_THRESHOLD = 10; 

            if (spentMins >= DOOM_THRESHOLD) {
                console.warn("AUTO-DETECTION: Doom scroll threshold crossed!");
                addLog('danger', `AUTO-TRIGGER: Excessive continuous time detected on ${appName} (${Math.round(spentMins)}m).`);
                
                // Trigger the intervention automatically!
                triggerFocusRoom({
                    message: `You've been on ${appName} for over ${DOOM_THRESHOLD} minutes straight. Your brain needs a dopamine reset.`,
                    suggestedExercise: 'Mindful Bubble Pop'
                }, {
                    sessions: [{ appName: appName, duration: spentMins }] // Mock scenario for the parent alert
                });

                // Reset timer for this specific app so it doesn't re-trigger every 2 seconds
                currentAppStart = Date.now();
                return; // Priority given to continuous doom scrolling
            }
        }

        // AUTO-TRIGGER: If total daily screen time exceeds 1 hour
        const totalTimeStr = document.getElementById('stat-screen-time').textContent;
        const totalMins = parseInt(totalTimeStr);
        if (totalMins >= 60) {
             addLog('danger', `AUTO-TRIGGER: Daily limit of 60 minutes reached across all apps.`);
             triggerFocusRoom({
                message: `You've reached your daily limit of 60 minutes. It's time for a meaningful digital break.`,
                suggestedExercise: 'Mindful Bubble Pop'
            });
            // Stop tracking to prevent infinite loop on next poll
            stopTracking();
        }
    }

    function updateLiveTopAppsChart() {
        if (!topAppsInstance) return;

        // Clone accumulated sessions
        const liveSessions = { ...accumulatedSessions };

        // Add the currently running app's live time (in minutes, keeping fractions so it visibly moves)
        if (currentApp && currentAppStart) {
            const spentMs = Date.now() - currentAppStart;
            const liveElapsedMins = spentMs / 60000;
            if (!liveSessions[currentApp]) liveSessions[currentApp] = 0;
            liveSessions[currentApp] += liveElapsedMins;
        }

        const appLabels = Object.keys(liveSessions);
        if (appLabels.length === 0) return;

        // Sort descending so the most used apps are at the top
        appLabels.sort((a, b) => liveSessions[b] - liveSessions[a]);

        const appData = appLabels.map(app => Number(Math.max(0.1, liveSessions[app]).toFixed(2))); // At least 0.1 so it creates a visible bar even when just opened

        topAppsInstance.data.labels = appLabels;
        topAppsInstance.data.datasets[0].data = appData;
        topAppsInstance.update();

        // Also aggressively update the core stats in real-time so they aren't zero!
        const totalLiveTime = Object.values(liveSessions).reduce((a, b) => a + b, 0);
        const maxLiveTime = Math.max(...Object.values(liveSessions));
        
        document.getElementById('stat-screen-time').textContent = `${Math.max(1, Math.round(totalLiveTime))}m`;
        document.getElementById('stat-sessions').textContent = appLabels.length;
        document.getElementById('stat-longest').textContent = `${Math.max(1, Math.round(maxLiveTime))}m`;
    }

    function handleAppChange(newApp, windowTitle) {
        if (currentApp !== newApp) {
            if (currentApp !== null) {
                const spentMs = Date.now() - currentAppStart;
                const spentMins = spentMs / 60000;
                if (!accumulatedSessions[currentApp]) accumulatedSessions[currentApp] = 0;
                accumulatedSessions[currentApp] += spentMins;
            }

            currentApp = newApp;
            currentAppStart = Date.now();
            appSwitchCount++;
            awayCountEl.textContent = appSwitchCount;
            awayIndicator.style.display = 'flex';

            // --- COGNITIVE LOAD TRACKING ---
            switchTimestamps.push(Date.now());
            const cutoff = Date.now() - COG_WINDOW_MS;
            switchTimestamps = switchTimestamps.filter(t => t > cutoff);
            updateCognitiveLoad(switchTimestamps.length);

            if (['Instagram', 'TikTok', 'Discord', 'YouTube', 'Google Chrome'].includes(currentApp)) {
                trackingDot.className = 'tracking-dot away';
                trackingBar.classList.add('away-mode');
                awayLabelEl.textContent = `Active App: ${currentApp} ⚠️`;
                awayIndicator.classList.add('away-indicator');
                awayIndicator.style.color = 'var(--warn)';
            } else {
                trackingDot.className = 'tracking-dot tracking';
                trackingBar.classList.remove('away-mode');
                awayLabelEl.textContent = `Active App: ${currentApp}`;
                awayIndicator.classList.remove('away-indicator');
                awayIndicator.style.color = 'var(--success)';
                awayIndicator.querySelector('i').style.animation = 'none';
            }
            addLog('info', `OS EVENT: Switched window to [${currentApp}] - "${windowTitle.substring(0, 30)}..."`);
        }
    }

    function updateCognitiveLoad(switchCount) {
        const bar   = document.getElementById('cog-load-bar');
        const label = document.getElementById('stat-cog-load');
        if (!bar || !label) return;
        let pct, text, cls;
        if (switchCount <= 3)       { pct = switchCount * 10; text = 'Low';      cls = ''; }
        else if (switchCount <= 8)  { pct = 30 + switchCount * 5; text = 'Medium'; cls = 'medium'; }
        else                         { pct = Math.min(100, 70 + switchCount * 3); text = 'High'; cls = 'high'; }
        bar.style.width = pct + '%';
        bar.className = 'cog-load-bar ' + cls;
        label.textContent = text;
        if (switchCount > 10 && text === 'High') {
            showToast('warn', 'High Cognitive Load', `${switchCount} app switches in 5 min. Your focus is fragmenting.`);
        }
    }

    function stopTracking() {
        isTracking = false;
        clearInterval(sessionTimerInt);
        clearInterval(osPolyTimerInt);

        if (currentApp) {
            const spentMs = Date.now() - currentAppStart;
            const spentMins = Math.max(1, Math.round(spentMs / 60000));
            if (!accumulatedSessions[currentApp]) accumulatedSessions[currentApp] = 0;
            accumulatedSessions[currentApp] += spentMins;
        }

        trackingDot.className = 'tracking-dot idle';
        trackingLabel.textContent = 'Live Tracking: OFF';
        trackingBar.classList.remove('active', 'away-mode');
        awayIndicator.style.display = 'none';
        btnStart.style.display = 'inline-flex';
        btnStop.style.display = 'none';
        addLog('info', `OS Tracking stopped. Processing session data...`);

        const finalSessions = Object.keys(accumulatedSessions).map(appName => ({
            appName, duration: Math.max(1, Math.round(accumulatedSessions[appName]))
        }));

        // --- SAVE TO LOCALSTORAGE HISTORY ---
        const totalTime = finalSessions.reduce((a, s) => a + s.duration, 0);
        const dateKey = new Date().toDateString();
        const todayEntry = { date: dateKey, totalTime, sessions: finalSessions, interventions: interventionCount };
        let history = JSON.parse(localStorage.getItem('ng_history') || '[]');
        const existingIdx = history.findIndex(e => e.date === dateKey);
        if (existingIdx >= 0) {
            history[existingIdx].totalTime += totalTime;
            history[existingIdx].interventions += interventionCount;
        } else {
            history.push(todayEntry);
        }
        if (history.length > 30) history = history.slice(-30);
        localStorage.setItem('ng_history', JSON.stringify(history));
        updateWeeklyChart();
        analyzeRealSessions(finalSessions);
    }

    async function analyzeRealSessions(sessionsArray) {
        if (sessionsArray.length === 0) sessionsArray.push({ appName: 'Desktop / Idle', duration: 1 });
        addLog('info', `Sending native OS timeline to AI engine for deep analysis...`);
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessions: sessionsArray, sensitivity })
            });
            const data = await response.json();
            let socialMs = 0, workMs = 0;
            sessionsArray.forEach(s => {
                if (['Discord', 'Instagram', 'TikTok', 'Google Chrome'].includes(s.appName)) socialMs += s.duration;
                else workMs += s.duration;
            });
            const scenario = {
                sessions: sessionsArray,
                chartData: [workMs, 0, socialMs, 0],
                appData:   sessionsArray.map(s => s.duration),
                appLabels: sessionsArray.map(s => s.appName)
            };
            updateUI(data, scenario);
        } catch (error) {
            addLog('danger', 'Backend offline. Run: cd backend && node server.js');
        }
    }

    btnStart.addEventListener('click', startTracking);
    btnStop.addEventListener('click', stopTracking);



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

    // ---------- TOP APPS HORIZONTAL CHART ----------
    let topAppsInstance = null;

    function initTopAppsChart() {
        const ctx = document.getElementById('topAppsChart').getContext('2d');
        topAppsInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Instagram', 'TikTok', 'YouTube', 'Twitter', 'Khan Academy', 'BBC News', 'Settings'],
                datasets: [{
                    label: 'Minutes',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    backgroundColor: [
                        'rgba(255, 118, 117, 0.8)',
                        'rgba(108, 92, 231, 0.8)',
                        'rgba(253, 203, 110, 0.8)',
                        'rgba(0, 184, 212, 0.8)',
                        'rgba(0, 206, 201, 0.8)',
                        'rgba(129, 236, 236, 0.8)',
                        'rgba(160, 165, 181, 0.5)'
                    ],
                    borderRadius: 6,
                    borderSkipped: false,
                    barThickness: 22,
                }]
            },
            options: {
                indexAxis: 'y',   // <-- Makes it horizontal
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 900, easing: 'easeInOutQuart' },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
                        ticks: { color: '#a0a5b5', font: { size: 11 } }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#ffffff', font: { size: 12, weight: '500' } }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.parsed.x} minutes`
                        }
                    }
                }
            }
        });
    }
    initTopAppsChart();

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
        const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
                { appName: 'BBC News', duration: 10 },
                { appName: 'Instagram', duration: 5 }
            ],
            chartData: [35, 10, 5, 0],
            appData: [5, 0, 0, 0, 35, 10, 2],
            label: 'Healthy Usage Simulation'
        },
        moderate: {
            sessions: [
                { appName: 'Twitter', duration: 12 },
                { appName: 'YouTube', duration: 28 },
                { appName: 'News', duration: 22 }
            ],
            chartData: [0, 22, 12, 28],
            appData: [8, 0, 28, 12, 0, 22, 5],
            label: 'Moderate Usage Simulation'
        },
        doom: {
            sessions: [
                { appName: 'Wikipedia', duration: 2 },
                { appName: 'TikTok', duration: 22 },
                { appName: 'Instagram', duration: 18 }
            ],
            chartData: [2, 0, 40, 0],
            appData: [18, 22, 0, 0, 2, 0, 0],
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

        // Update Opportunity Cost
        const pagesRead = Math.round(totalTime * 0.5); // Assume 1 page every 2 minutes
        const caloriesBurned = totalTime * 4; // Assume 4 cal per minute walk
        document.getElementById('cost-pages').textContent = pagesRead;
        document.getElementById('cost-calories').textContent = caloriesBurned;

        // Update Productivity Bar
        const prodTime = Object.keys(accumulatedSessions)
            .filter(app => PRODUCTIVE_APPS.includes(app))
            .reduce((sum, app) => sum + accumulatedSessions[app], 0);
        
        const prodPercentage = totalTime > 0 ? Math.min(100, Math.round((prodTime / totalTime) * 100)) : 0;
        document.getElementById('prod-percent').textContent = `${prodPercentage}%`;
        document.getElementById('prod-bar-fill').style.width = `${prodPercentage}%`;
    }

    // ---------- MAIN UI UPDATE ----------
    function updateUI(data, scenario) {
        const { sessions, chartData, appData, appLabels } = scenario;

        // Update category chart
        chartInstance.data.datasets[0].data = chartData;
        chartInstance.update();

        // Update Top Apps horizontal chart
        if (appData && topAppsInstance) {
            topAppsInstance.data.datasets[0].data = appData;
            
            // If live OS tracking provides true labels, use them. 
            // Otherwise, stick to the hardcoded simulation labels.
            if (appLabels && appLabels.length > 0) {
                topAppsInstance.data.labels = appLabels;
            } else {
                topAppsInstance.data.labels = ['Instagram', 'TikTok', 'YouTube', 'Twitter', 'Khan Academy', 'BBC News', 'Settings'];
            }
            topAppsInstance.update();
        }

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
            addLog('warn', `Moderate usage flagged — Total time: ${sessions.reduce((a, s) => a + s.duration, 0)}m. Consider a break.`);
            showToast('warn', 'Heads Up!', data.intervention?.message || 'You are approaching your daily limit. Consider a 5-min break.');
        } else if (data.status === 'Risk') {
            uiScoreCircle.style.stroke = 'var(--danger)';
            uiStatusBadge.classList.add('status-risk');
            uiScoreHint.textContent = 'Doom-scrolling detected! Intervention triggered.';
            addLog('danger', 'DOOM-SCROLL DETECTED — Hard intervention triggered. Session locked.');
            triggerFocusRoom(data.intervention, scenario);
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

    // ---------- FOCUS ROOM & DOOM SCROLL RECOVERY ----------
    const quotes = [
        "The mind is everything. What you think you become. – Buddha",
        "Almost everything will work again if you unplug it for a few minutes. – Anne Lamott",
        "You don't have to be controlled by your screens.",
        "Your attention is your most valuable asset. Guard it.",
        "Disconnect to reconnect with yourself."
    ];

    function createBubble() {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.addEventListener('click', () => {
            bubble.classList.add('popped');
            setTimeout(() => {
                if(bubble.parentNode) bubble.parentNode.removeChild(bubble);
                createBubble(); // spawn a new one to keep them engaged
            }, 300);
        });
        return bubble;
    }

    async function triggerFocusRoom(intervention, scenario) {
        interventionCount++;
        statInterventions.textContent = interventionCount;
        focusOverlay.classList.remove('hidden');
        document.getElementById('intervention-msg').textContent = intervention?.message || 'You have been doom-scrolling. Take a breath.';

        // Random Quote
        document.getElementById('thought-quote').textContent = quotes[Math.floor(Math.random() * quotes.length)];

        // Initialize Bubble Game
        const bubbleContainer = document.getElementById('bubble-game');
        bubbleContainer.innerHTML = '';
        for(let i=0; i<8; i++) bubbleContainer.appendChild(createBubble());

        // Send Parent Alert!
        if (scenario && scenario.sessions) {
            const badSession = scenario.sessions.find(s => ['TikTok', 'Instagram', 'Discord'].includes(s.appName)) || scenario.sessions[0];
            try {
                fetch(`${API_URL}/api/parent/alert`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ minutes: badSession.duration, appName: badSession.appName })
                });
            } catch(e) {}
        }

        btnDismiss.disabled = true;
        btnDismiss.innerHTML = `<i class="fa-solid fa-lock"></i> Unlocking in <span id="lock-timer">15</span>s`;
        let timeLeft = 15;

        if (lockCountdown) clearInterval(lockCountdown);
        lockCountdown = setInterval(() => {
            timeLeft--;
            const timerSpan = document.getElementById('lock-timer');
            if (timerSpan) timerSpan.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(lockCountdown);
                btnDismiss.disabled = false;
                btnDismiss.innerHTML = `<i class="fa-solid fa-unlock"></i> I'm mindful now — Unlock`;
            }
        }, 1000);
    }

    btnDismiss.addEventListener('click', () => {
        focusOverlay.classList.add('hidden');
    });

    // ---------- NAVIGATION & TABS ----------
    const navDashboard = document.getElementById('nav-dashboard');
    const navFocus = document.getElementById('nav-focus');
    const navEducation = document.getElementById('nav-education');
    const navSettings = document.getElementById('nav-settings');
    
    const viewDashboard = document.getElementById('view-dashboard');
    const viewFocus = document.getElementById('view-focus');
    const viewEducation = document.getElementById('view-education');
    const viewSettings = document.getElementById('view-settings');

    function switchTab(activeNav, activeView) {
        [navDashboard, navFocus, navEducation, navSettings].forEach(n => n.classList.remove('active'));
        [viewDashboard, viewFocus, viewEducation, viewSettings].forEach(v => v.style.display = 'none');
        activeNav.classList.add('active');
        activeView.style.display = 'block';
    }

    navDashboard.addEventListener('click', () => switchTab(navDashboard, viewDashboard));
    navFocus.addEventListener('click', () => switchTab(navFocus, viewFocus));
    navEducation.addEventListener('click', () => switchTab(navEducation, viewEducation));
    navSettings.addEventListener('click', () => switchTab(navSettings, viewSettings));

    // ---------- POMODORO TIMER — UPGRADED ----------
    const pomodoroTime   = document.getElementById('pomodoro-time');
    const pomodoroStatus = document.getElementById('pomodoro-status');
    const btnPomoStart   = document.getElementById('btn-pomo-start');
    const btnPomoPause   = document.getElementById('btn-pomo-pause');
    const btnPomoReset   = document.getElementById('btn-pomo-reset');
    const pomoRing       = document.getElementById('pomo-ring-progress');
    const RING_CIRC      = 339.3; // 2 * π * 54

    let pomoTimer       = null;
    let pomoTotalSecs   = 25 * 60;
    let pomoTimeLeft    = pomoTotalSecs;
    let isPomoRunning   = false;
    let currentMode     = 'focus';   // focus | short | long
    let pomoSessionsDone = parseInt(localStorage.getItem('ng_pomo_count_today') || '0');
    let pomoFocusTime    = parseInt(localStorage.getItem('ng_pomo_time_today')  || '0');
    let ambientNode      = null;
    let ambientCtx       = null;

    function formatPomoTime(s) {
        return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
    }

    function updateRing(secondsLeft, totalSecs) {
        const pct    = secondsLeft / totalSecs;
        const offset = RING_CIRC * (1 - pct);
        if (pomoRing) pomoRing.style.strokeDashoffset = offset;
    }

    function updatePomoCounterUI() {
        const row   = document.getElementById('pomo-counter-row');
        const label = document.getElementById('pomo-count');
        const ftEl  = document.getElementById('focus-total-time');
        const fsEl  = document.getElementById('focus-sessions-done');
        const streak = localStorage.getItem('ng_streak') || '0';
        document.getElementById('focus-streak-local').textContent = streak;
        if (label)  label.textContent = pomoSessionsDone;
        if (ftEl)   ftEl.textContent  = `${Math.round(pomoFocusTime)}m`;
        if (fsEl)   fsEl.textContent  = pomoSessionsDone;
        if (!row) return;
        row.innerHTML = '';
        const show = Math.max(pomoSessionsDone, 1);
        for (let i = 0; i < show; i++) {
            const t = document.createElement('span');
            t.className = 'pomo-tomato' + (i < pomoSessionsDone ? ' done' : '');
            t.textContent = i < pomoSessionsDone ? '🍅' : '⬜';
            row.appendChild(t);
        }
    }

    function setMode(mode, mins) {
        if (isPomoRunning) return;
        currentMode    = mode;
        pomoTotalSecs  = mins * 60;
        pomoTimeLeft   = pomoTotalSecs;
        pomodoroTime.textContent   = formatPomoTime(pomoTimeLeft);
        pomodoroStatus.textContent = mode === 'focus' ? 'Ready to Focus' : mode === 'short' ? 'Short Break' : 'Long Break';
        updateRing(pomoTimeLeft, pomoTotalSecs);
        if (pomoRing) {
            pomoRing.className = 'pomo-ring-progress';
            if (mode === 'short') pomoRing.classList.add('running-short');
            if (mode === 'long')  pomoRing.classList.add('running-long');
        }
        btnPomoStart.innerHTML = `<i class="fa-solid fa-play"></i> Start ${mode === 'focus' ? 'Focus' : 'Break'}`;

        // Show/hide duration presets (only for focus mode)
        const presetsEl = document.getElementById('duration-presets');
        if (presetsEl) presetsEl.style.display = mode === 'focus' ? 'flex' : 'none';
    }

    function startPomodoro() {
        if (isPomoRunning) return;
        isPomoRunning = true;
        pomodoroStatus.textContent = currentMode === 'focus' ? 'Focusing...' : 'On Break...';
        btnPomoStart.style.display = 'none';
        btnPomoPause.style.display = 'inline-flex';

        pomoTimer = setInterval(() => {
            if (pomoTimeLeft > 0) {
                pomoTimeLeft--;
                pomodoroTime.textContent = formatPomoTime(pomoTimeLeft);
                updateRing(pomoTimeLeft, pomoTotalSecs);
            } else {
                clearInterval(pomoTimer);
                isPomoRunning = false;
                btnPomoPause.style.display = 'none';
                btnPomoStart.style.display = 'inline-flex';

                if (currentMode === 'focus') {
                    // Log completed focus session
                    pomoSessionsDone++;
                    pomoFocusTime += pomoTotalSecs / 60;
                    localStorage.setItem('ng_pomo_count_today', pomoSessionsDone);
                    localStorage.setItem('ng_pomo_time_today',  Math.round(pomoFocusTime));
                    updatePomoCounterUI();
                    pomodoroStatus.textContent = '🎉 Focus Complete!';
                    btnPomoStart.innerHTML = '<i class="fa-solid fa-mug-hot"></i> Start Break';
                    showToast('success', 'Focus Complete!', `${pomoTotalSecs/60} minutes of deep work logged. Take a well-earned break.`);
                    addLog('success', `Pomodoro: ${pomoTotalSecs/60}m focus session complete! 🍅`);
                    playSound('success');
                    // Auto-suggest break
                    const task = document.getElementById('focus-task-input')?.value;
                    if (task) addLog('info', `Session intention was: "${task}"`);
                } else {
                    pomodoroStatus.textContent = '✅ Break Over!';
                    btnPomoStart.innerHTML = '<i class="fa-solid fa-brain"></i> Start Focus';
                    showToast('info', 'Break Complete', 'Time to get back to work!');
                    playSound('info');
                }
            }
        }, 1000);
    }

    function pausePomodoro() {
        if (!isPomoRunning) return;
        isPomoRunning = false;
        clearInterval(pomoTimer);
        pomodoroStatus.textContent = 'Paused';
        btnPomoPause.style.display = 'none';
        btnPomoStart.style.display = 'inline-flex';
        btnPomoStart.innerHTML = '<i class="fa-solid fa-play"></i> Resume';
    }

    function resetPomodoro() {
        isPomoRunning = false;
        clearInterval(pomoTimer);
        pomoTimeLeft = pomoTotalSecs;
        pomodoroTime.textContent   = formatPomoTime(pomoTimeLeft);
        pomodoroStatus.textContent = currentMode === 'focus' ? 'Ready to Focus' : 'Ready for Break';
        updateRing(pomoTimeLeft, pomoTotalSecs);
        btnPomoPause.style.display = 'none';
        btnPomoStart.style.display = 'inline-flex';
        btnPomoStart.innerHTML = `<i class="fa-solid fa-play"></i> Start ${currentMode === 'focus' ? 'Focus' : 'Break'}`;
    }

    btnPomoStart.addEventListener('click', startPomodoro);
    btnPomoPause.addEventListener('click', pausePomodoro);
    btnPomoReset.addEventListener('click', resetPomodoro);

    // Session type tabs
    document.querySelectorAll('.session-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.session-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            setMode(tab.dataset.mode, parseInt(tab.dataset.mins));
        });
    });

    // Duration presets
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (isPomoRunning) return;
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            pomoTotalSecs = parseInt(btn.dataset.mins) * 60;
            pomoTimeLeft  = pomoTotalSecs;
            pomodoroTime.textContent = formatPomoTime(pomoTimeLeft);
            updateRing(pomoTimeLeft, pomoTotalSecs);
        });
    });

    // Ambient sound (Web Audio API generated tones)
    function stopAmbient() {
        if (ambientNode) { try { ambientNode.stop(); } catch(_){} ambientNode = null; }
    }
    function playAmbient(type) {
        stopAmbient();
        if (type === 'off' || !type) return;
        try {
            ambientCtx = ambientCtx || new (window.AudioContext || window.webkitAudioContext)();
            const bufSize = ambientCtx.sampleRate * 2;
            const buf = ambientCtx.createBuffer(1, bufSize, ambientCtx.sampleRate);
            const data = buf.getChannelData(0);
            if (type === 'white') {
                for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.06;
            } else if (type === 'rain') {
                for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.04 * (Math.sin(i * 0.001) * 0.5 + 0.5);
            } else if (type === 'forest') {
                for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.03 * Math.abs(Math.sin(i * 0.0005));
            }
            const src = ambientCtx.createBufferSource();
            src.buffer = buf; src.loop = true;
            const gain = ambientCtx.createGain(); gain.gain.value = 0.5;
            src.connect(gain); gain.connect(ambientCtx.destination);
            src.start(); ambientNode = src;
        } catch(_) { showToast('warn', 'Audio', 'Click anywhere first to enable sound in this browser.'); }
    }

    document.querySelectorAll('.ambient-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.ambient-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            playAmbient(btn.dataset.sound);
        });
    });

    // Init counter display
    updatePomoCounterUI();
    updateRing(pomoTimeLeft, pomoTotalSecs);



    // ---------- TIER 2: GAMIFICATION STREAK ----------
    function initGamification() {
        const today = new Date().toDateString();
        const lastLogin = localStorage.getItem('ng_last_login');
        let streak = parseInt(localStorage.getItem('ng_streak')) || 0;

        if (lastLogin !== today) {
            // Check if they logged in yesterday
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            if (lastLogin === yesterday.toDateString()) {
                streak++; // Keep streak alive!
            } else {
                streak = 1; // Reset streak
            }
            localStorage.setItem('ng_last_login', today);
            localStorage.setItem('ng_streak', streak);
        }

        const streakEl = document.getElementById('day-streak');
        if (streakEl) streakEl.textContent = `${streak} Day${streak > 1 ? 's' : ''} Streak`;
    }
    initGamification();

    // ---------- TIER 2: WEEKLY TREND CHART ----------
    const ctxTrend = document.getElementById('weeklyTrendChart').getContext('2d');
    let weeklyChartInstance = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [
                {
                    label: 'Productive Time',
                    data: [120, 150, 140, 180, 160, 200, 210],
                    borderColor: '#00cec9',
                    backgroundColor: 'rgba(0, 206, 201, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Doom Scroll Time',
                    data: [80, 70, 95, 60, 50, 40, 30],
                    borderColor: '#ff7675',
                    backgroundColor: 'rgba(255, 118, 117, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: '#a0a5b5', font: { family: 'Outfit' } } }
            },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a5b5' } },
                x: { grid: { display: false }, ticks: { color: '#a0a5b5' } }
            }
        }
    });

    // ---------- TIER 3: AI COACH & FAB ----------
    const aiCoachFab = document.getElementById('ai-coach-fab');
    const aiCoachModal = document.getElementById('ai-coach-modal');
    const closeAiCoach = document.getElementById('close-ai-coach');
    const aiAdviceContainer = document.getElementById('ai-advice-container');

    aiCoachFab.addEventListener('click', () => {
        aiCoachModal.classList.remove('hidden');
        generateAiAdvice();
    });

    closeAiCoach.addEventListener('click', () => {
        aiCoachModal.classList.add('hidden');
    });

    function buildAiContext() {
        return {
            score:       parseInt(uiScoreText.textContent) || 0,
            status:      uiStatusBadge.textContent,
            productivity:parseInt(document.getElementById('prod-percent').textContent) || 0,
            screenTime:  document.getElementById('stat-screen-time').textContent,
            sessions:    document.getElementById('stat-sessions').textContent,
            streak:      parseInt(localStorage.getItem('ng_streak')) || 0,
            topApps:     Object.keys(accumulatedSessions).slice(0, 5)
        };
    }

    async function sendAiMessage(userText) {
        const body = aiBody;
        // Show user bubble
        const userBubble = document.createElement('div');
        userBubble.className = 'ai-message user';
        userBubble.innerHTML = `<div class="ai-avatar"><i class="fa-solid fa-user"></i></div><div class="ai-bubble">${userText}</div>`;
        body.appendChild(userBubble);

        // Show typing indicator
        const typingWrap = document.createElement('div');
        typingWrap.className = 'ai-message bot';
        typingWrap.innerHTML = `<div class="ai-avatar"><i class="fa-solid fa-robot"></i></div><div class="ai-typing"><span></span><span></span><span></span></div>`;
        body.appendChild(typingWrap);
        body.scrollTop = body.scrollHeight;

        try {
            const res = await fetch('http://localhost:3000/api/ai-coach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userText, context: buildAiContext(), geminiKey })
            });
            const data = await res.json();
            typingWrap.remove();
            const botBubble = document.createElement('div');
            botBubble.className = 'ai-message bot ai-advice';
            botBubble.innerHTML = `<div class="ai-avatar"><i class="fa-solid fa-robot"></i></div><div class="ai-bubble">${(data.reply || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>`;
            body.appendChild(botBubble);
        } catch(e) {
            typingWrap.remove();
            const errBubble = document.createElement('div');
            errBubble.className = 'ai-message bot';
            errBubble.innerHTML = `<div class="ai-avatar"><i class="fa-solid fa-robot"></i></div><div class="ai-bubble" style="color:var(--danger)">Backend offline. Start the server first.</div>`;
            body.appendChild(errBubble);
        }
        body.scrollTop = body.scrollHeight;
    }

    function generateAiAdvice() {
        sendAiMessage('Analyze my current digital health and give me personalised advice.');
    }

    // Chat input send
    const aiInput   = document.getElementById('ai-chat-input');
    const aiSendBtn = document.getElementById('ai-send-btn');
    const aiBody    = document.getElementById('ai-body');

    function handleAiSend() {
        const txt = aiInput.value.trim();
        if (!txt) return;
        aiInput.value = '';
        sendAiMessage(txt);
    }
    aiSendBtn.addEventListener('click', handleAiSend);
    aiInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleAiSend(); });

    // =========================================
    // FEATURE: ONBOARDING
    // =========================================
    (function initOnboarding() {
        if (localStorage.getItem('ng_onboarded')) return;
        const overlay  = document.getElementById('onboarding-overlay');
        const slides   = document.querySelectorAll('.onboard-slide');
        const dots     = document.querySelectorAll('.dot');
        const btnNext  = document.getElementById('btn-onboard-next');
        const btnSkip  = document.getElementById('btn-onboard-skip');
        let currentSlide = 0;

        overlay.classList.remove('hidden');

        function goTo(idx) {
            slides[currentSlide].classList.remove('active');
            dots[currentSlide].classList.remove('active');
            currentSlide = idx;
            slides[currentSlide].classList.add('active');
            dots[currentSlide].classList.add('active');
            if (currentSlide === slides.length - 1) {
                btnNext.innerHTML = '<i class="fa-solid fa-rocket"></i> Get Started';
            }
        }

        btnNext.addEventListener('click', () => {
            if (currentSlide < slides.length - 1) { goTo(currentSlide + 1); }
            else { finishOnboarding(); }
        });
        btnSkip.addEventListener('click', finishOnboarding);

        function finishOnboarding() {
            overlay.classList.add('hidden');
            localStorage.setItem('ng_onboarded', '1');
        }
    })();

    // =========================================
    // FEATURE: SETTINGS SAVE / LOAD
    // =========================================
    (function initSettings() {
        // Pre-populate inputs
        const emailEl    = document.getElementById('setting-guardian-email');
        const sensEl     = document.getElementById('setting-sensitivity');
        const prodEl     = document.getElementById('setting-prod-multiplier');
        const soundEl    = document.getElementById('setting-sound');
        const geminiEl   = document.getElementById('setting-gemini-key');
        const saveBtn    = document.getElementById('btn-save-settings');
        const clearBtn   = document.getElementById('btn-clear-history');

        if (emailEl)  emailEl.value   = guardianEmail;
        if (sensEl)   sensEl.value    = sensitivity;
        if (prodEl)   prodEl.checked  = prodMultiplier;
        if (soundEl)  soundEl.checked = soundEnabled;
        if (geminiEl) geminiEl.value  = geminiKey;

        saveBtn && saveBtn.addEventListener('click', () => {
            guardianEmail  = emailEl?.value   || '';
            sensitivity    = sensEl?.value    || 'balanced';
            prodMultiplier = prodEl?.checked  ?? true;
            soundEnabled   = soundEl?.checked ?? true;
            geminiKey      = geminiEl?.value  || '';

            localStorage.setItem('ng_guardian_email', guardianEmail);
            localStorage.setItem('ng_sensitivity',    sensitivity);
            localStorage.setItem('ng_prod_mult',      prodMultiplier);
            localStorage.setItem('ng_sound',          soundEnabled);
            localStorage.setItem('ng_gemini_key',     geminiKey);
            showToast('success', 'Settings Saved', 'Your preferences have been updated.');
        });

        clearBtn && clearBtn.addEventListener('click', () => {
            localStorage.removeItem('ng_history');
            updateWeeklyChart();
            showToast('info', 'History Cleared', 'All session history has been erased.');
        });
    })();

    // =========================================
    // FEATURE: REAL WEEKLY CHART FROM LOCALSTORAGE
    // =========================================
    function updateWeeklyChart() {
        const history = JSON.parse(localStorage.getItem('ng_history') || '[]');
        const days    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const labels  = [];
        const prodData = [];
        const doomData = [];

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toDateString();
            labels.push(days[d.getDay()]);
            const entry = history.find(e => e.date === key);
            if (entry) {
                let prod = 0, doom = 0;
                (entry.sessions || []).forEach(s => {
                    if (PRODUCTIVE_APPS.includes(s.appName)) prod += s.duration;
                    else doom += s.duration;
                });
                prodData.push(prod);
                doomData.push(doom);
            } else {
                prodData.push(0);
                doomData.push(0);
            }
        }

        if (weeklyChartInstance) {
            weeklyChartInstance.data.labels             = labels;
            weeklyChartInstance.data.datasets[0].data   = prodData;
            weeklyChartInstance.data.datasets[1].data   = doomData;
            weeklyChartInstance.update();
        }
    }

    // =========================================
    // FEATURE: KEYBOARD SHORTCUTS
    // =========================================
    document.addEventListener('keydown', e => {
        if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
        if (e.key === 'd' || e.key === 'D') {
            document.getElementById('nav-dashboard').click();
        } else if (e.key === 'f' || e.key === 'F') {
            document.getElementById('nav-focus').click();
        } else if (e.key === 'Escape') {
            document.getElementById('focus-overlay')?.classList.add('hidden');
            document.getElementById('ai-coach-modal')?.classList.add('hidden');
        }
    });

    // =========================================
    // FEATURE: PARENT REMINDER POLLING
    // =========================================
    setInterval(async () => {
        try {
            const res  = await fetch('http://localhost:3000/api/parent/check-reminder');
            const data = await res.json();
            if (data.hasReminder) {
                showToast('warn', '📣 Message from Parent', data.message, 8000);
                playSound('warn');
            }
        } catch (_) { /* backend offline — silent fail */ }
    }, 10000);

    // =========================================
    // SOUND SYSTEM
    // =========================================
    function playSound(type) {
        if (!soundEnabled) return;
        try {
            const ctx  = new (window.AudioContext || window.webkitAudioContext)();
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            const freqs = { success: 880, warn: 440, danger: 220, info: 660 };
            osc.frequency.value = freqs[type] || 660;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.start(); osc.stop(ctx.currentTime + 0.4);
        } catch(_) {}
    }

    // =========================================
    // FEATURE: PWA INSTALL BUTTON
    // =========================================
    let deferredPrompt;
    const installBtn = document.getElementById('pwa-install-btn');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (installBtn) installBtn.style.display = 'inline-flex';
    });

    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            deferredPrompt = null;
            installBtn.style.display = 'none';
        });
    }

    window.addEventListener('appinstalled', (evt) => {
        showToast('success', 'App Installed', 'NeuroGuard desktop app installed successfully!');
        if (installBtn) installBtn.style.display = 'none';
    });

    // Init real weekly data on load
    updateWeeklyChart();

});
