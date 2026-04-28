const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// ---------- HEALTH CHECK ----------
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        engine: 'NeuroGuard AI Detection Engine v1.0',
        timestamp: new Date().toISOString()
    });
});

// ---------- BEHAVIOR ANALYSIS ENDPOINT ----------
/**
 * POST /api/analyze-behavior
 * Body: { sessions: [{ appName: string, duration: number }] }
 * Returns: { addictionScore, status, intervention, breakdown }
 */
app.post('/api/analyze-behavior', (req, res) => {
    const { sessions } = req.body;

    // --- Guards ---
    if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
        return res.status(400).json({ error: 'Invalid payload: sessions array is required.' });
    }

    // --- Rule Engine Constants ---
    const DOOM_SCROLL_APPS    = ['TikTok', 'Instagram', 'Shorts', 'Reels', 'Snapchat'];
    const DOOM_THRESHOLD_MINS = 15;   // Single session > 15 mins = doom-scroll
    const NIGHT_HOUR_START    = 23;   // After 11 PM = night usage penalty
    const MODERATE_TOTAL_MINS = 60;   // Total > 60 mins = moderate flag

    let totalTime           = 0;
    let doomScrollDetected  = false;
    let nightUsage          = false;
    let longestSession      = 0;
    let sessionCount        = sessions.length;

    const currentHour = new Date().getHours();
    if (currentHour >= NIGHT_HOUR_START || currentHour < 5) {
        nightUsage = true;
    }

    sessions.forEach(session => {
        totalTime += session.duration;
        if (session.duration > longestSession) longestSession = session.duration;

        // Rule 1: Doom-scroll detection
        if (
            session.duration >= DOOM_THRESHOLD_MINS &&
            DOOM_SCROLL_APPS.includes(session.appName)
        ) {
            doomScrollDetected = true;
        }
    });

    // --- Base Score Calculation ---
    let score = Math.min(100, Math.floor(totalTime * 0.5));

    // --- Apply Scoring Penalties ---
    const penalties = [];

    if (doomScrollDetected) {
        score += 40;
        penalties.push('DOOM_SCROLL (+40)');
    }
    if (nightUsage) {
        score += 15;
        penalties.push('NIGHT_USAGE (+15)');
    }
    if (sessionCount >= 3) {
        score += 10;
        penalties.push('HIGH_FREQUENCY (+10)');
    }
    if (longestSession >= 30) {
        score += 10;
        penalties.push('EXTENDED_SESSION (+10)');
    }

    score = Math.min(100, score);

    // --- Determine Status & Intervention ---
    let status = 'Healthy';
    let intervention = null;

    if (doomScrollDetected) {
        status = 'Risk';
        intervention = {
            level: 'Hard',
            action: 'TRIGGER_FOCUS_ROOM',
            message: 'Continuous scrolling detected for over 15 minutes. Your attention is being hijacked. Time to breathe.',
            suggestedExercise: 'Box Breathing (4-4-4-4)'
        };
    } else if (totalTime > MODERATE_TOTAL_MINS || nightUsage) {
        status = 'Moderate';
        intervention = {
            level: 'Soft',
            action: 'SHOW_ALERT',
            message: nightUsage
                ? 'Late-night screen use detected! This affects your sleep quality. Consider winding down.'
                : 'You have spent over an hour on screen. A short break will boost your focus.',
            suggestedTask: 'Stand up, stretch, and drink a glass of water.'
        };
    }

    // --- Response ---
    res.json({
        addictionScore: score,
        status,
        intervention,
        breakdown: {
            totalTime,
            longestSession,
            sessionCount,
            nightUsage,
            doomScrollDetected,
            penalties
        }
    });
});

app.listen(PORT, () => {
    console.log(`🚀 NeuroGuard API running on http://localhost:${PORT}`);
    console.log(`🔍 Detection Engine: Ready`);
});
