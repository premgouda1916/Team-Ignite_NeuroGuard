document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000';
    let pollInterval = null;

    const viewLogin = document.getElementById('view-login');
    const viewDashboard = document.getElementById('view-dashboard');
    const btnLogin = document.getElementById('btn-login');
    const btnLogout = document.getElementById('btn-logout');
    const btnLock = document.getElementById('btn-lock');

    const liveScore = document.getElementById('live-score');
    const liveState = document.getElementById('live-state');

    function showToast(type, title, message) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'check' : 'triangle-exclamation'}"></i><div><strong>${title}</strong><br><small>${message}</small></div>`;
        document.getElementById('toast-container').appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    btnLogin.addEventListener('click', async () => {
        const pwd = document.getElementById('parent-pwd').value;
        try {
            const res = await fetch(`${API_URL}/api/parent/login`, {
                method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({password:pwd})
            });
            const data = await res.json();
            if (data.success) {
                viewLogin.style.display = 'none';
                viewDashboard.style.display = 'block';
                showToast('success', 'Logged In', 'Welcome to the Parent Portal');
                startPolling();
            } else {
                showToast('danger', 'Access Denied', 'Incorrect parent password.');
            }
        } catch(e) {
            showToast('danger', 'System Offline', 'Could not connect to child device backend.');
        }
    });

    btnLogout.addEventListener('click', () => {
        clearInterval(pollInterval);
        viewDashboard.style.display = 'none';
        viewLogin.style.display = 'block';
        document.getElementById('parent-pwd').value = '';
    });

    btnLock.addEventListener('click', async () => {
        try {
            const res = await fetch(`${API_URL}/api/parent/lock`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                showToast('success', 'Device Locked', 'The child device screen has been hard-locked.');
                btnLock.innerHTML = '<i class="fa-solid fa-lock"></i> DEVICE CURRENTLY LOCKED';
                setTimeout(() => btnLock.innerHTML = '<i class="fa-solid fa-lock"></i> INSTANT HARD LOCK DEVICE', 5000);
            }
        } catch(e) {
            showToast('danger', 'Lock Failed', 'Terminal connection to device lost.');
        }
    });

    async function pollStatus() {
        try {
            const res = await fetch(`${API_URL}/api/parent/status`);
            const data = await res.json();
            
            liveScore.textContent = data.score;
            liveState.textContent = data.status;

            liveState.className = 'state-badge';
            if (data.status === 'Healthy') liveState.classList.add('state-healthy');
            else if (data.status === 'Moderate') liveState.classList.add('state-moderate');
            else if (data.status === 'Risk') liveState.classList.add('state-risk');
        } catch(e) {}
    }

    function startPolling() {
        pollStatus();
        pollInterval = setInterval(pollStatus, 5000);
    }
});
