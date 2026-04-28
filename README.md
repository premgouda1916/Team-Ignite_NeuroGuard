# 🧠 NeuroGuard — The Digital Habit Guardian
> **Restoring Human Agency in the Age of the Attention Economy.**

NeuroGuard is a comprehensive, OS-integrated digital wellness suite designed to combat "doom-scrolling," mitigate digital addiction, and provide parents with remote oversight over their family's digital health. Built for **TechFusion 2.0**, it leverages real-time behavioral analysis and proactive interventions to break the dopamine loops created by modern social media.

---

## 🚀 Key Features

### 💻 OS-Native Behavioral Tracking
Unlike browser-only extensions, NeuroGuard uses a **Node.js + PowerShell Bridge** to track the active foreground window across the entire Operating System—detecting a "doom-scroll" whether you're in Chrome, TikTok for Desktop, or Discord.

### 🛡️ Parental Control & Remote Locking
- **Parent Global Dashboard:** A dedicated portal (`/parent.html`) with real-time status polling.
- **Remote Hard-Lock:** Parents can instantly trigger a Windows Session Lock (`rundll32.exe`) on the child's device if suspicious activity is detected.
- **Automated Email Alerts:** Integrated with **Nodemailer**, the system sends detailed HTML usage alerts to parents when "Risk" behavior is detected.

### 🧠 AI-Driven Interventions
- **The Doom-Scroll Sentinel:** Automatically detects continuous usage (>10m) of high-dopamine apps and fires a "Mindful Reset."
- **Habit Recovery Room:** Features a **Bubble-Pop Mini-game** (to occupy hands) and **Mind-Refreshing Quotes** (to reset focus) while the countdown timer runs.
- **AI Habit Coach:** A conversational bot that provides custom behavioral advice based on your live Addiction and Productivity scores.

### 📊 Advanced Analytics
- **Addiction vs. Productivity Tracking:** Distinguishes between "Bad" (Scrolling) and "Good" (IDE/Learning) usage.
- **Opportunity Cost Engine:** Live-calculates how many pages of a book you could have read or calories you could have burned during your scroll time.
- **Weekly Trend Insights:** Visualizes long-term behavioral shifts to track improvement.
- **Dark Pattern Knowledge Base:** Educates users on manipulative UX (Infinite Scroll, Variable Rewards, FOMO alerts).

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3 (Glassmorphism), Vanilla JavaScript
- **Backend:** Node.js, Express.js
- **OS Integration:** PowerShell, Node `child_process`
- **Analytics:** Chart.js, LocalStorage Streaks
- **Communications:** Nodemailer (Ethereal Integration)
- **PWA:** Service Workers, Manifest v3 for offline/installable support

---

## 🏁 Installation & Setup

### Prerequisites
- Node.js (v16+)
- Windows OS (for native window tracking & remote lock features)

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
   - **User Dashboard:** `http://localhost:3000`
   - **Parental Portal:** `http://localhost:3000/parent.html` (Password: `admin123`)

---

## 🛰️ The "NeuroGuard Elite" Roadmap (Tier 3)
- **Predictive Burnout Detection:** Analyzing "Context Switching" frequency to warn users of digital fatigue *before* it happens.
- **IOT Home Sync:** Dimming smart lights in the user's room when late-night scrolling is detected.
- **Community Wellness Squads:** Privacy-first accountability groups with friends.

---

## 👥 The Team — Ignite
Built with passion for **TechFusion 2.0** to solve a modern social crisis.

*“Your attention is the only thing you truly own. We help you guard it.”*

---
© 2026 NeuroGuard AI. Licensed under MIT.
