# 🚀 Sky Blaster — Polished Arcade Shooter

A fast-paced, juicy vertical shoot-em-up built with React, TypeScript, and Canvas. Features tight controls, satisfying feedback, and endless waves of enemies.

**[▶️ Play Now](https://your-demo-url.com)** *(replace with your deployed URL)*

![Sky Blaster Gameplay](https://via.placeholder.com/800x400?text=Gameplay+Screenshot)

---

## ✨ Features

- 🎮 **Dual Input Support** — Keyboard (WASD/Arrows + Z/Space) and touch/mouse drag controls
- 💥 **Juicy Feedback** — Screen shake, particle explosions, shockwave rings, score popups, slow-motion on boss kills
- 🌌 **Polished Visuals** — Parallax starfield, nebula clouds, engine flames, bullet glow effects
- 📊 **Persistent High Scores** — Local storage leaderboard with top 10 scores
- 🎵 **Procedural Audio** — Web Audio API synthesized sound effects (no external files)
- 📱 **Mobile Optimized** — Responsive design, touch-friendly, 60fps on mobile devices
- ♾️ **Endless Mode** — Infinite waves with scaling difficulty and boss fights every 5 waves

---

## 🎯 How to Play

### Controls

| Platform | Move | Shoot | Bomb | Pause |
|----------|------|-------|------|-------|
| **Keyboard** | `WASD` or `Arrow Keys` | `Space` or `Z` | `X` or `B` | `Esc` or `P` |
| **Touch/Mouse** | Drag anywhere | Auto-fire while touching | — | Tap when paused |

### Objective

Survive as long as possible, destroy enemies, collect power-ups, and achieve the highest score!

---

## 💎 Power-Ups

| Icon | Color | Name | Effect |
|------|-------|------|--------|
| **S** | 🟠 Orange | **Spread** | +2 bullets per level (max Lv3 = 7 bullets) |
| **F** | 🟢 Green | **Fire Rate** | Increases shooting speed |
| **◇** | 🔵 Blue | **Shield** | Blocks 1 hit, lasts 10 seconds |
| **B** | 🔴 Red | **Bomb** | Clears all enemy bullets, damages all enemies |
| **+** | 💚 Teal | **Heal** | Restores 1 HP (or +500 score if full) |

---

## 👾 Enemies

| Type | Color | Behavior | Points |
|------|-------|----------|--------|
| **Basic** | Red | Standard movement patterns | 100 |
| **Fast** | Green | Quick, erratic movement | 150 |
| **Tank** | Brown | Slow, high HP | 300 |
| **Boss** | Dark Red | Appears every 5 waves, fires spread shots | 2000 |

---

## 🌊 Wave System

- **Endless waves** with increasing difficulty
- Enemy count per wave: `5 + wave × 2`
- **Boss waves** every 5th wave (Wave 5, 10, 15...)
- Boss HP scales: `20 + wave × 5`
- Enemies shoot faster and move quicker as waves progress

---

## 🏆 Scoring System

| Action | Points |
|--------|--------|
| Basic enemy kill | 100 |
| Fast enemy kill | 150 |
| Tank enemy kill | 300 |
| Boss kill | 2000 |
| Graze (near-miss) | +10 |
| Combo bonus | +50% per 5 kills |
| Heal at full HP | +500 |

---

## 🛠️ Tech Stack

- **React 19** — UI framework
- **TypeScript** — Type safety
- **Vite** — Build tool
- **Tailwind CSS 4** — Styling
- **Canvas API** — Game rendering
- **Web Audio API** — Procedural sound synthesis

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/polished-arcade-shooter.git
cd polished-arcade-shooter

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Project Structure

```
src/
├── App.tsx           # Main React component with game loop
├── game/
│   ├── engine.ts     # Core game logic, update & render
│   ├── types.ts      # TypeScript interfaces
│   └── audio.ts      # Web Audio synthesizer
├── index.css         # Global styles
└── main.tsx          # Entry point
```

---

## 📝 License

MIT License — feel free to use, modify, and distribute.

---

## 🙏 Acknowledgments

- Inspired by classic shoot-em-ups like Raiden, 1942, and Touhou
- Built with ❤️ using modern web technologies

---

**Made with 🎮 by [Your Name]**
