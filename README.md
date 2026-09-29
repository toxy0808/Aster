# ✦ ASTER

<div align="center">

### **Activity • Reputation • Automations • Discord Components V2**

*A modern, high-performance Discord assistant designed to elevate server engagement with real-time activity tracking, automated reputation tiers, pattern-matched responses, and Discord's next-gen layout components.*

---

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14%2B-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org/)
[![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://github.com/WiseLibs/better-sqlite3)
[![License](https://img.shields.io/badge/License-MIT-F7931E?style=for-the-badge)](LICENSE)

</div>

---

## 📌 Table of Contents
- [Features](#-features)
- [Bot Architecture](#-bot-architecture)
- [Getting Started](#-getting-started)
- [Commands & Usage](#-commands--usage)
- [Database Structure](#-database-structure)
- [Configuration](#-configuration)
- [License](#-license)

---

## ✨ Features

### 📊 **Activity & Leveling Engine**
* **Dynamic XP & Math Scaling:** Calculates XP gain per message and calculates exact level progression via square-root formula logic.
* **Message & Voice Analytics:** Logs granular chat and voice participation to an optimized SQLite database.
* **Leaderboards:** Displays real-time 24-hour and 7-day server rankings for chatters and voice active members.

### ✨ **Reputation & Roles**
* **`+rep` and `-rep` Triggers:** Simple shortcuts for members to bestow or deduct reputation points.
* **Tiered Rate Limits:** Configurable daily limits separated by member tier (Regular, Staff, Funder, Combined).
* **Automated Role Rewards:** Unlocks configurable Discord roles automatically upon reaching key reputation milestones.

### 🤖 **Smart Auto-Responder**
* **Regex Trigger Matching:** Evaluates trigger length priority to avoid overlapping auto-responses.
* **Multi-Format Output:** Supports text, attached files (Images/GIFs), and rich **Discord Components V2** containers.
* **Per-User Cooldowns:** Built-in 5-second cooldown timer per trigger/user pair to eliminate spam.

### 🎯 **Auto Reactions**
* **Targeted Reactions:** Instantly reacts with configured user emojis upon receiving messages from targeted accounts.

### 🎨 **Components V2 Design**
* Built natively with `ContainerBuilder`, `TextDisplayBuilder`, and `SeparatorBuilder` for clean, card-like native Discord displays.

---

## 📁 Bot Architecture

```text
aster/
├── database/
│   ├── database.js        # Primary SQLite initialization & migrations
│   └── activityLogs.js    # Specialized table queries for voice & message logs
├── events/
│   └── messageCreate.js   # Main handler for commands, autoreacts, XP & auto-responder
├── commands/              # Dynamic command modules
├── aster.db               # Auto-generated SQLite database file
└── index.js               # Application entry point
