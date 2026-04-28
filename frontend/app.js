document.addEventListener('DOMContentLoaded', () => {
    // State
    const API_URL = 'http://localhost:3000/api/analyze-behavior';
    let chartInstance = null;

    // Elements
    const btnSimulateHealthy = document.getElementById('btn-simulate-healthy');
    const btnSimulateDoom = document.getElementById('btn-simulate-doom');
    
    const uiScoreCircle = document.getElementById('score-ring');
    const uiScoreText = document.getElementById('score-text');
    const uiStatusBadge = document.getElementById('status-text');

    const focusOverlay = document.getElementById('focus-overlay');
    const lockTimerEl = document.getElementById('lock-timer');
    const btnDismissFocus = document.getElementById('btn-dismiss-focus');
    let lockCountdown = null;

    // Initialize Chart
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
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    initChart();

    // Data Generators
    const generateHealthyPayload = () => ({
        sessions: [
            { appName: 'Khan Academy', duration: 35 },
            { appName: 'News', duration: 10 },
            { appName: 'Instagram', duration: 5 }
        ]
    });

    const generateDoomPayload = () => ({
        sessions: [
            { appName: 'Wikipedia', duration: 2 },
            { appName: 'TikTok', duration: 22 },   // Trigger: > 15m
            { appName: 'Instagram', duration: 18 } // Trigger: > 15m
        ]
    });

    // Update UI Elements
    function updateUI(data, mockChartData) {
        // Update Chart
        chartInstance.data.datasets[0].data = mockChartData;
        chartInstance.update();

        // Update Score Circular Progress
        const score = data.addictionScore;
        uiScoreText.textContent = score;
        uiScoreCircle.setAttribute('stroke-dasharray', `${score}, 100`);
        
        // Color mapping
        uiStatusBadge.textContent = data.status;
        uiStatusBadge.className = 'status-badge'; // reset
        
        if (data.status === 'Healthy') {
            uiScoreCircle.style.stroke = 'var(--success)';
            uiStatusBadge.classList.add('status-healthy');
        } else if (data.status === 'Moderate') {
            uiScoreCircle.style.stroke = '#fdcb6e';
            uiStatusBadge.classList.add('status-moderate');
        } else if (data.status === 'Risk') {
            uiScoreCircle.style.stroke = 'var(--danger)';
            uiStatusBadge.classList.add('status-risk');
        }

        // Handle Intervention
        if (data.intervention && data.intervention.level === 'Hard') {
            triggerFocusRoom(data.intervention);
        }
    }

    async function sendData(payload, mockChartData) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            updateUI(data, mockChartData);
        } catch (error) {
            console.error("Error communicating with AI engine:", error);
            alert("Backend is offline. Please run 'npm start' in the backend folder.");
        }
    }

    // Interactions
    btnSimulateHealthy.addEventListener('click', () => {
        sendData(generateHealthyPayload(), [35, 10, 5, 0]);
    });

    btnSimulateDoom.addEventListener('click', () => {
        sendData(generateDoomPayload(), [2, 0, 40, 0]);
    });

    // Hard Intervention "Focus Room" Logic
    function triggerFocusRoom(intervention) {
        focusOverlay.classList.remove('hidden');
        document.getElementById('intervention-msg').textContent = intervention.message;
        document.getElementById('exercise-name').textContent = intervention.suggestedExercise;
        
        btnDismissFocus.disabled = true;
        let timeLeft = 15; // 15 seconds lock
        lockTimerEl.textContent = timeLeft;

        const breatheEl = document.querySelector('.breathe-text');
        
        if (lockCountdown) clearInterval(lockCountdown);
        
        lockCountdown = setInterval(() => {
            timeLeft--;
            lockTimerEl.textContent = timeLeft;
            
            // Sync text with CSS animation (roughly 4s inhale, 4s exhale)
            breatheEl.textContent = (timeLeft % 8 > 4) ? 'Inhale' : 'Exhale';

            if (timeLeft <= 0) {
                clearInterval(lockCountdown);
                btnDismissFocus.disabled = false;
                btnDismissFocus.textContent = 'I am mindful now. Unlock.';
            }
        }, 1000);
    }

    btnDismissFocus.addEventListener('click', () => {
        focusOverlay.classList.add('hidden');
        // Reset state after intervention (mock)
        sendData(generateHealthyPayload(), [35, 10, 5, 0]);
    });
});
