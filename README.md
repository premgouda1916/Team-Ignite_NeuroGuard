# 🧠 NeuroGuard — The Digital Habit Guardian
> **Restoring Human Agency in the Age of the Attention Economy.**

NeuroGuard is a comprehensive, OS-integrated digital wellness suite designed to combat "doom-scrolling," mitigate digital addiction, and provide parents with remote oversight over their family's digital health. Built for **TechFusion 2.0**, it leverages real-time behavioral analysis and proactive interventions to break the dopamine loops created by modern social media.

---

## 📍 Checkpoint 5 Status: FINAL PRODUCTION POLISH

We are proud to announce that the **Checkpoint 5** milestones are complete. NeuroGuard is fully optimized and finalized for hackathon evaluation.

### New & Enhanced in Checkpoint 5:
- **System Audit & Drawback Identification:** Analyzed system architecture for potential edge cases and limitations.
- **API Resiliency Fallbacks:** Ensured the AI Habit Coach operates smoothly even without valid API keys using local rule-based heuristics.
- **Cross-Origin & State Syncing:** Fixed state persistence mismatches between frontend sessions and server tracking.

---

## 📍 Checkpoint 4 Status: IMPLEMENTED
- **Gamified Onboarding Flow:** Interactive guided tour for first-time users.
- **Cognitive Load Tracker:** Real-time monitoring of mental fatigue based on context switching.
- **Deep Work Focus Suite:** Pomodoro implementation with Task Intention and Ambient Audio.
- **PWA Integration:** Installable desktop application support.

---

## 🚀 Key Features

### 💻 OS-Native Behavioral Tracking
Unlike browser-only extensions, NeuroGuard uses a **Node.js + PowerShell Bridge** to track the active foreground window across the entire Operating System—detecting a "doom-scroll" whether you're in Chrome, TikTok for Desktop, or Discord.

### 🛡️ Parental Control & Remote Locking
- **Secure Child Authentication:** Dedicated login protection for the dashboard (Default: `child123`).
- **Parent Global Dashboard:** A dedicated portal (`/parent.html`) with real-time status polling (Default: `admin123`).
- **Remote Hard-Lock:** Parents can instantly trigger a Windows Session Lock (`rundll32.exe`) on the child's device if suspicious activity is detected.
- **Automated Email Alerts:** Integrated with **Nodemailer**, the system sends detailed HTML usage alerts to parents when "Risk" behavior is detected.

### 🧠 AI-Driven Interventions
- **The Doom-Scroll Sentinel:** Automatically detects continuous usage of high-dopamine apps and fires a "Mindful Reset."
- **Habit Recovery Room:** Features a **Bubble-Pop Mini-game** (to occupy hands) and **Mind-Refreshing Quotes** while the countdown timer runs.
- **AI Habit Coach:** A conversational bot powered by **Google Gemini** providing custom behavioral advice.

### 📊 Advanced Analytics
- **Addiction vs. Productivity Tracking:** Distinguishes between "Bad" (Scrolling) and "Good" (IDE/Learning) usage.
- **Opportunity Cost Engine:** Live-calculates pages read or calories burned during your scroll time.
- **Weekly Trend Insights:** Visualizes long-term behavioral shifts.
- **UX Knowledge Base:** Educates users on manipulative "Dark Patterns."

---

## ⚠️ Known Drawbacks & Limitations

To ensure full transparency for evaluation, the following engineering trade-offs were made during development:

1. **OS Locking Mechanism:**
   - The native OS tracking relies on PowerShell (`GetForegroundWindow`) and `rundll32.exe`. This makes the heavy backend tracking features **Windows-only**.
2. **Backend Polling Load:**
   - The application relies on frontend intervals polling backend endpoints every 2 seconds. Spawning recursive PowerShell instances introduces slight CPU overhead on lower-end machines.
3. **Data Volatility:**
   - Long-term trends are stored in client-side `LocalStorage`. If the user clears their browser cache, historical tracking data will reset unless backend DB integration is fully set up.
4. **Parent Alert SMTP setup:**
   - Currently defaults to Ethereal test mail logic for demonstration safety. Production ready SMTP protocols must be provided via `.env`.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3 (Glassmorphism), Vanilla JavaScript
- **Backend:** Node.js, Express.js
- **OS Integration:** PowerShell, Node `child_process`
- **AI Engine:** Google Gemini API (Generative AI SDK)
- **Analytics:** Chart.js, LocalStorage Streaks
- **Communications:** Nodemailer
- **PWA:** Service Workers, Manifest v3

---

## 🏁 Installation & Setup

### Prerequisites
- Node.js (v16+)
- Windows OS (for native window tracking features)

### Quick Start
1. **Clone the Repo:**
   ```bash
   git clone https://github.com/premgouda1916/Team-Ignite_NeuroGuard.git
   cd Team-Ignite_NeuroGuard
   ```

2. **Setup Backend:**
   ```bash
   cd backend
   npm install
   node server.js
   ```

3. **Access the Application:**
   - **User Dashboard:** `http://localhost:3000` (Child Password: `child123`)
   - **Parental Portal:** `http://localhost:3000/parent.html` (Parent Password: `admin123`)

---

## 👥 The Team — Ignite
Built with passion for **TechFusion 2.0** to solve a modern social crisis.

*“Your attention is the only thing you truly own. We help you guard it.”*

---
© 2026 NeuroGuard AI. Licensed under MIT.

