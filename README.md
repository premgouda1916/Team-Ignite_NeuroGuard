# 🧠 NeuroGuard — AI Attention Economy Protector

Hey there! Welcome to **NeuroGuard**, our submission for the TechFusion 2.0 Hackathon under the **"Web Platforms for Digital Transformation & Social Impact"** track.

We built this because we all felt it — the pull of infinite scrolling, the wasted hours, the guilt of opening Instagram for "just 5 minutes" and coming back 40 minutes later. NeuroGuard is our answer to the modern attention economy.

---

## 🌟 What Does It Do?

NeuroGuard is a web-based digital wellness platform that:

- **Monitors your digital behavior** and classifies it in real-time as Healthy, Moderate, or Risk
- **Detects doom-scrolling** (continuous social media use over 15 minutes on apps like TikTok, Instagram, etc.)
- **Actively intervenes** — not just with a notification, but with a full-screen "Focus Room" lock that forces a 15-second box breathing exercise before you can continue
- **Shows you the data** — habit stats, usage breakdowns, live detection logs, and an Addiction Score (0–100)

---

## 🚦 Hackathon Progress

### ✅ Checkpoint 1 — Initial Setup & Idea Validation *(Completed)*
- Locked in the project concept and pivoted to a Web Platform to fit the hackathon domain
- Set up the Node.js backend and core frontend architecture
- Designed the dark-mode glassmorphism UI system

### ✅ Checkpoint 2 — Core Development Progress *(Completed at 5:00 PM)*

This checkpoint was all about making the platform feel real and functional. Here is what we built and shipped:

**🧠 AI Detection Engine (Backend)**
- Built a rule-based behavior analysis API at `POST /api/analyze-behavior`
- Detection rules implemented:
  - **Doom-Scroll Rule:** Any single session > 15 minutes on TikTok, Instagram, Shorts, or Reels → flags as HIGH RISK
  - **Night-Time Usage Rule:** Activity detected after 11 PM → +15 penalty to Addiction Score
  - **High Frequency Rule:** 3+ app sessions in a short window → +10 penalty
  - **Extended Session Rule:** A session exceeding 30 minutes → +10 penalty
- Added a `/api/status` health check endpoint to confirm the engine is online
- Responses now include a full `breakdown` object showing every detected penalty

**📊 Live Dashboard (Frontend)**
- Added **4 real-time Stat Cards**: Screen Time Today, Sessions Detected, Longest Session, and Interventions Triggered
- Built a **live Detection Engine Log** that shows timestamped AI decisions as they happen
- Integrated **3 Simulation Modes**: Healthy Use, Moderate Use, and Doom-Scroll (each sends a unique payload with different apps and durations to the backend)
- Added **Toast Notification System** — soft, animated slide-in popups for non-critical alerts (Moderate state)
- Hard intervention for Risk state → **Focus Room Overlay** with box breathing exercise and a 15-second timed unlock

**🕐 UI Enhancements**
- Live clock in the sidebar footer showing current local time
- NeuroGuard logo rebranded with a brain icon
- Improved chart animations and card hover effects

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3 (Glassmorphism), Vanilla JS |
| Charts | Chart.js (via CDN) |
| Backend | Node.js + Express.js |
| API Style | REST |
| Design | Dark Mode, CSS Variables, CSS Animations |

---

## ⚙️ Running Locally

```bash
# Step 1: Enter the backend folder
cd backend

# Step 2: Install dependencies
npm install

# Step 3: Start the server
node server.js
```

Then open your browser at **`http://localhost:3000`**

### How to Test
Once the dashboard loads, use the three buttons in the top-right corner:
- **"Healthy Use"** → Score stays green, get a success toast notification
- **"Moderate Use"** → Score turns yellow, triggers a soft warning toast
- **"Doom-Scroll"** → Score spikes to Risk, triggers the full-screen Focus Room intervention with a breathing exercise

---

*Team Ignite | TechFusion 2.0 | April 2026*
