const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Mock AI Engine Endpoint: Analyzes usage array and returns Intervention Actions
app.post('/api/analyze-behavior', (req, res) => {
    const { sessions } = req.body;
    let doomScrollingDetected = false;
    let totalTime = 0;
    
    if (sessions && sessions.length > 0) {
        sessions.forEach(session => {
            totalTime += session.duration;
            // Rule: If a single session is > 15 minutes, flag as doom-scrolling
            if (session.duration >= 15 && ['TikTok', 'Instagram', 'Shorts'].includes(session.appName)) {
                doomScrollingDetected = true;
            }
        });
    }

    // Default response: Safe
    let response = {
        addictionScore: Math.min(100, Math.floor(totalTime * 0.5)),
        status: 'Healthy',
        intervention: null
    };

    if (doomScrollingDetected) {
        response.status = 'Risk';
        response.intervention = {
            level: 'Hard',
            action: 'TRIGGER_FOCUS_ROOM',
            message: 'You have been scrolling continuously for over 15 minutes. Take a breath.',
            suggestedExercise: 'Box Breathing (4-4-4-4)'
        };
        // Add huge penalty
        response.addictionScore = Math.min(100, response.addictionScore + 40);
    } else if (totalTime > 60) {
        response.status = 'Moderate';
        response.intervention = {
            level: 'Soft',
            action: 'SHOW_ALERT',
            message: 'You have spent over an hour purely on your screen. Consider taking a short break.',
            suggestedTask: 'Stand up and stretch.'
        };
        response.addictionScore = Math.min(100, response.addictionScore + 20);
    }

    res.json(response);
});

app.listen(PORT, () => {
    console.log(`🚀 NeuroGuard API running on http://localhost:${PORT}`);
});
