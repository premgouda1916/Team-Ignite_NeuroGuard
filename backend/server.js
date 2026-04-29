require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
const nodemailer = require('nodemailer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// ---------- GEMINI AI SETUP ----------
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ---------- IN-MEMORY STATE ----------
let latestChildScore = 0;
let latestChildStatus = 'Unknown';
let latestChildTopApps = [];
let dailyLimitMinutes = 60;
let transporter = null;
let sessionHistory = []; // Stores daily session summaries

// Initialize Ethereal Test Email
nodemailer.createTestAccount((err, account) => {
    if (err) return console.error('Failed to create a testing email account: ', err);
    console.log('✉️  Setup Ethereal testing email for Parent Alerts.');
    transporter = nodemailer.createTransport({
        host: account.smtp.host, port: account.smtp.port, secure: account.smtp.secure,
        auth: { user: account.user, pass: account.pass }
    });
});

// ---------- NATIVE OS LIVE TRACKER ----------
app.get('/api/active-window', (req, res) => {
    const scriptPath = path.join(__dirname, 'active_window.ps1');
    exec(`powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}"`, { windowsHide: true }, (error, stdout) => {
        if (error) {
            console.error('OS Tracker Error:', error);
            return res.json({ appName: 'Unknown', title: '' });
        }
        const output = stdout.trim();
        if (!output) return res.json({ appName: 'Unknown', title: '' });
        const parts = output.split('|');
        res.json({ appName: parts[0] || 'Unknown', title: parts[1] || '' });
    });
});

// ---------- GEMINI AI COACH ENDPOINT ----------
app.post('/api/ai-coach', async (req, res) => {
    const { message, context } = req.body;

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        return res.status(503).json({
            reply: "⚠️ Gemini API key not configured. Please add your GEMINI_API_KEY to the backend/.env file and restart the server. For now, here's my rule-based advice: " + getRuleBasedAdvice(context)
        });
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const systemPrompt = `You are NeuroGuard, an empathetic and science-backed AI wellness coach specialized in digital addiction and behavioral psychology. Your tone is calm, supportive, and data-driven. Keep responses under 3 sentences and be specific.

Current user context:
- Addiction Score: ${context?.score ?? 0}/100
- Status: ${context?.status ?? 'Unknown'}
- Productivity Level: ${context?.productivity ?? 0}%
- Screen Time Today: ${context?.screenTime ?? '0m'}
- Top Apps Used: ${(context?.topApps ?? []).join(', ') || 'None recorded'}
- Sessions Today: ${context?.sessions ?? 0}
- Day Streak: ${context?.streak ?? 0} days

User message: ${message}

Respond as NeuroGuard AI Coach. Be specific about their data. Use markdown bold (**) for emphasis.`;

        const result = await model.generateContent(systemPrompt);
        const response = result.response;
        const text = response.text();
        res.json({ reply: text });
    } catch (error) {
        console.error('Gemini API Error:', error.message);
        res.status(500).json({ reply: getRuleBasedAdvice(context) });
    }
});

function getRuleBasedAdvice(context) {
    const score = context?.score ?? 0;
    const prod = context?.productivity ?? 0;
    const status = context?.status ?? '';
    if (status === 'Risk' || score > 70) {
        return `Your addiction score of ${score} is critical. Your dopamine loops are being hijacked. I strongly recommend closing social media apps and doing a 5-minute breathing exercise before continuing.`;
    } else if (prod < 20 && score > 30) {
        return `Only ${prod}% of your screen time is productive. Try opening a learning tool or code editor for your next session to rebalance your digital diet.`;
    } else if (score < 30) {
        return `Excellent digital hygiene with a score of ${score}! You are in a high-performance flow state. Maintain this balance by taking a short physical break every 45 minutes.`;
    }
    return `You're at score ${score} with ${prod}% productivity. Set a clear intention for every app you open — ask yourself: "Is this serving my goals?"`;
}

// ---------- SESSION HISTORY ----------
app.post('/api/sessions', (req, res) => {
    const { session } = req.body;
    if (!session) return res.status(400).json({ error: 'session required' });
    sessionHistory.push({ ...session, timestamp: new Date().toISOString() });
    // Keep last 100 sessions
    if (sessionHistory.length > 100) sessionHistory = sessionHistory.slice(-100);
    res.json({ success: true });
});

app.get('/api/sessions', (req, res) => {
    res.json({ sessions: sessionHistory });
});

// ---------- PARENTAL CONTROLS ----------
app.post('/api/parent/login', (req, res) => {
    const { password } = req.body;
    if (password === 'admin123') return res.json({ success: true, token: 'parent-token' });
    res.status(401).json({ success: false, message: 'Invalid password' });
});

app.get('/api/parent/status', (req, res) => {
    res.json({
        score: latestChildScore,
        status: latestChildStatus,
        topApps: latestChildTopApps,
        history: sessionHistory.slice(-20)
    });
});

app.post('/api/parent/lock', (req, res) => {
    exec(`rundll32.exe user32.dll,LockWorkStation`, (error) => {
        if (error) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

// Daily limit management
app.get('/api/parent/daily-limit', (req, res) => {
    res.json({ limit: dailyLimitMinutes });
});

app.post('/api/parent/daily-limit', (req, res) => {
    const { limit } = req.body;
    if (!limit || isNaN(limit)) return res.status(400).json({ error: 'valid limit (minutes) required' });
    dailyLimitMinutes = parseInt(limit);
    console.log(`📋 Parent updated daily limit to ${dailyLimitMinutes} minutes`);
    res.json({ success: true, limit: dailyLimitMinutes });
});

// Break reminder (fires toast on child's screen via polling)
let pendingReminder = null;
app.post('/api/parent/remind', (req, res) => {
    pendingReminder = { message: req.body.message || 'Your parent wants you to take a break!', timestamp: Date.now() };
    res.json({ success: true });
});

app.get('/api/parent/check-reminder', (req, res) => {
    if (pendingReminder && Date.now() - pendingReminder.timestamp < 30000) {
        const reminder = pendingReminder;
        pendingReminder = null;
        return res.json({ hasReminder: true, message: reminder.message });
    }
    res.json({ hasReminder: false });
});

// Parent alert email
app.post('/api/parent/alert', async (req, res) => {
    const { minutes, appName, guardianEmail } = req.body;
    
    // Update global state so parent dashboard can see it
    latestChildScore = req.body.score || latestChildScore;
    latestChildStatus = req.body.status || latestChildStatus;

    if (!transporter) return res.status(500).json({ error: 'Mail engine starting up...' });

    const mailOptions = {
        from: '"NeuroGuard Monitor" <alerts@neuroguard.local>',
        to: guardianEmail || 'parent@home.local',
        subject: `🚨 NeuroGuard Alert: Excessive Usage on ${appName}`,
        html: `<div style="font-family: Arial; padding: 20px; border: 1px solid #dcdcdc; border-radius: 8px; background:#f9f9f9;">
                 <h2 style="color: #d63031;">🧠 NeuroGuard Usage Alert</h2>
                 <p>Your child's usage on a high-risk application has triggered a threshold block.</p>
                 <table style="border-collapse:collapse; width:100%; margin:20px 0;">
                   <tr><td style="padding:8px; font-weight:bold;">Application:</td><td style="padding:8px; color:#d63031;">${appName}</td></tr>
                   <tr style="background:#f0f0f0;"><td style="padding:8px; font-weight:bold;">Duration:</td><td style="padding:8px;">${Math.round(minutes)} minutes</td></tr>
                   <tr><td style="padding:8px; font-weight:bold;">Addiction Score:</td><td style="padding:8px;">${latestChildScore}/100</td></tr>
                   <tr style="background:#f0f0f0;"><td style="padding:8px; font-weight:bold;">Status:</td><td style="padding:8px;">${latestChildStatus}</td></tr>
                 </table>
                 <hr/>
                 <p>Please log into the <strong>Parent Dashboard</strong> to monitor or lock the device.</p>
               </div>`
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        const url = nodemailer.getTestMessageUrl(info);
        console.log(`\n\n!!! 📧 EMAIL ALERT SENT !!!\nView Email Here: ${url}\n\n`);
        res.json({ success: true, previewUrl: url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---------- HEALTH CHECK ----------
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        engine: 'NeuroGuard AI Detection Engine v2.0',
        geminiEnabled: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE'),
        timestamp: new Date().toISOString()
    });
});

// ---------- BEHAVIOR ANALYSIS ENDPOINT ----------
app.post('/api/analyze-behavior', (req, res) => {
    const { sessions } = req.body;
    const sensitivityOverride = req.body.sensitivity; // 'strict'|'balanced'|'lenient'

    if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
        return res.status(400).json({ error: 'Invalid payload: sessions array is required.' });
    }

    const DOOM_SCROLL_APPS    = ['TikTok', 'Instagram', 'Shorts', 'Reels', 'Snapchat'];
    const THRESHOLDS = {
        strict:   10,
        balanced: 15,
        lenient:  25
    };
    const DOOM_THRESHOLD_MINS = THRESHOLDS[sensitivityOverride] || 15;
    const NIGHT_HOUR_START    = 23;
    const MODERATE_TOTAL_MINS = dailyLimitMinutes;

    let totalTime = 0, doomScrollDetected = false, nightUsage = false, longestSession = 0;
    const sessionCount = sessions.length;
    const currentHour = new Date().getHours();
    if (currentHour >= NIGHT_HOUR_START || currentHour < 5) nightUsage = true;

    sessions.forEach(session => {
        totalTime += session.duration;
        if (session.duration > longestSession) longestSession = session.duration;
        if (session.duration >= DOOM_THRESHOLD_MINS && DOOM_SCROLL_APPS.includes(session.appName)) {
            doomScrollDetected = true;
        }
    });

    let score = Math.min(100, Math.floor(totalTime * 0.5));
    const penalties = [];

    if (doomScrollDetected) { score += 40; penalties.push('DOOM_SCROLL (+40)'); }
    if (nightUsage)          { score += 15; penalties.push('NIGHT_USAGE (+15)'); }
    if (sessionCount >= 3)   { score += 10; penalties.push('HIGH_FREQUENCY (+10)'); }
    if (longestSession >= 30){ score += 10; penalties.push('EXTENDED_SESSION (+10)'); }

    score = Math.min(100, score);

    let status = 'Healthy';
    let intervention = null;

    if (doomScrollDetected) {
        status = 'Risk';
        intervention = {
            level: 'Hard',
            action: 'TRIGGER_FOCUS_ROOM',
            message: `Continuous scrolling detected for over ${DOOM_THRESHOLD_MINS} minutes. Your attention is being hijacked. Time to breathe.`,
            suggestedExercise: 'Box Breathing (4-4-4-4)'
        };
    } else if (totalTime > MODERATE_TOTAL_MINS || nightUsage) {
        status = 'Moderate';
        intervention = {
            level: 'Soft',
            action: 'SHOW_ALERT',
            message: nightUsage
                ? 'Late-night screen use detected! This affects your sleep quality. Consider winding down.'
                : `You have spent over ${MODERATE_TOTAL_MINS} minutes on screen. A short break will boost your focus.`,
            suggestedTask: 'Stand up, stretch, and drink a glass of water.'
        };
    }

    latestChildScore = score;
    latestChildStatus = status;
    latestChildTopApps = sessions.map(s => s.appName);

    res.json({
        addictionScore: score, status, intervention,
        breakdown: { totalTime, longestSession, sessionCount, nightUsage, doomScrollDetected, penalties }
    });
});

app.listen(PORT, () => {
    const hasGemini = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE';
    console.log(`🚀 NeuroGuard API v2.0 running on http://localhost:${PORT}`);
    console.log(`🔍 Detection Engine: Ready`);
    console.log(`🤖 Gemini AI Coach: ${hasGemini ? '✅ Connected' : '⚠️  No API Key (rule-based fallback active)'}`);
    console.log(`📋 Daily Limit: ${dailyLimitMinutes} minutes`);
});
