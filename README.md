# 🛡️ NeuroGuard

Hey there! Welcome to the **NeuroGuard** repo. We built this project for the TechFusion 2.0 hackathon under the **Web Platforms for Digital Transformation & Social Impact** track.

Let's be honest—most of us spend way too much time staring at screens. Between TikTok, Instagram Reels, and endless YouTube Shorts, "doom-scrolling" has become a real problem. We noticed how much it was actively hurting our own productivity, focus, and mental health, so we decided to build something to fight back against the attention economy.

## 🌟 What is this all about?
**NeuroGuard** isn't just another screen-time app that simply tells you how many hours you wasted today. It's a web-based platform that actively *intervenes*. 

We built a visual dashboard that monitors your digital habits. When our engine detects that you are falling down a doom-scrolling rabbit hole, it triggers a "Focus Room"—a hard-blocking overlay that interrupts your scrolling and forces you to take a breather (literally, we put a box-breathing exercise in there!) before you can unlock your screen again.

---

## 🚦 Where We're At (Hackathon Progress)

We are currently uploading our progress for the first two checkpoints of the hackathon! 

**✅ Checkpoint 1 & 2 Completed!**
- **The Concept & Pivot:** We locked in our idea and pivoted to a Web Platform architecture to perfectly fit the domain.
- **The Tech Stack is Live:** We set up a custom Glassmorphic UI using pure HTML/CSS/JS (because we wanted it to look incredibly modern without the bloat of heavy frameworks), and connected it to a Node.js/Express backend.
- **Core Logic works:** We built the mock "AI Attention Engine" in the backend. It actively parses usage data and successfully triggers the Focus Room overlay when it detects a risk.

---

## 🛠️ Want to see it in action? (For the Judges)

We built a neat "Simulation Mode" so you don't have to wait 15 minutes to see the intervention trigger. Here is how you can run it on your local machine:

**1. Clone the repo and jump into the backend folder:**
```bash
cd backend
```

**2. Install the necessary packages:**
```bash
npm install
```

**3. Fire up the local server:**
```bash
node server.js
```

**4. Check out the dashboard!**
Open your favorite browser and head over to `http://localhost:3000`.

**How to test the simulation:**
Once the dashboard is loaded, look at the top right corner. 
- Try clicking the **"Simulate Healthy Use"** button to see how the dashboard charts normally react.
- Then, click **"Trigger Doom-Scroll"**. This will fire a payload simulating a bad scrolling session to our backend. Watch the Addiction Score spike and experience the fullscreen Focus Room intervention for yourself!

---

*Built with late-night coffee and a lot of passion for Team Ignite!*
