# 🧠 NeuroGuard — The Digital Habit Guardian
> **Restoring Human Agency in the Age of the Attention Economy.**

NeuroGuard is a comprehensive, OS-integrated digital wellness suite designed to combat "doom-scrolling," mitigate digital addiction, and provide parents with remote oversight over their family's digital health. Built for **TechFusion 2.0**, it leverages real-time behavioral analysis and proactive interventions to break the dopamine loops created by modern social media.

---

## 📍 Checkpoint 4 Status: FULLY IMPLEMENTED

We are proud to announce that **Checkpoint 4** milestones are complete. NeuroGuard is now a fully functional, production-ready Digital Wellness Suite. 

### New & Enhanced in Checkpoint 4:
- **Gamified Onboarding Flow:** Interactive guided tour for first-time users.
- **Cognitive Load Tracker:** Real-time monitoring of mental fatigue based on context switching.
- **Deep Work Focus Suite:** Pomodoro implementation with Task Intention and Ambient Audio.
- **PWA Integration:** Installable desktop application support.

---

## 🚀 Key Features

### 💻 OS-Native Behavioral Tracking
Unlike browser-only extensions, NeuroGuard uses a **Node.js + PowerShell Bridge** to track the active foreground window across the entire Operating System—detecting a "doom-scroll" whether you're in Chrome, TikTok for Desktop, or Discord.

### 🛡️ Parental Control & Remote Locking
- **Parent Global Dashboard:** A dedicated portal (`/parent.html`) with real-time status polling.
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
   - **User Dashboard:** `http://localhost:3000`
   - **Parental Portal:** `http://localhost:3000/parent.html` (Password: `admin123`)

---

## 👥 The Team — Ignite
Built with passion for **TechFusion 2.0** to solve a modern social crisis.

*“Your attention is the only thing you truly own. We help you guard it.”*

---
© 2026 NeuroGuard AI. Licensed under MIT.
