# Bermuda Strike 3D — Battle Royale TPS

A Three.js + React + TypeScript 3D Third-Person Battle Royale shooter inspired by Free Fire, featuring parachute deployment, rugged multi-octave terrain, 9 named settlements with 5 distinct building styles, AI combatants, gloo walls, shrinking safe zones, procedural Web Audio SFX, mobile touch controls, and PWA support.

## Features

- **3D Tactical Soldier & Skins**: Detailed humanoid character models with tactical gear, procedural PBR textures, dynamic shadows, and smooth skeletal animations (idle, walk, sprint, crouch, prone, jump, aim/fire, melee).
- **Large Rugged Map**: 248m playable island (`780m` terrain) with uneven hills, valleys, ring road, trees, rocks, and 9 settlements built with 5 architectural styles (Two-Story Villa, Timber Cabin, Brick Townhouse, Village Cottage, Warehouse).
- **Battle Royale Gameplay**:
  - Parachute drop phase with controllable descent & cut-chute option
  - 5-phase shrinking Safe Zone with zone damage outside the circle
  - Assault Rifle, SMG, Sniper, Shotgun, plus Melee hand combat
  - Gloo Wall tactical shields, Armor/Helmets, and Medkits
  - 24 / 36 / 48 AI combatants option in Lobby
- **Procedural Assets & Audio**: Self-contained procedural 3D models, canvas PBR textures, and Web Audio synthesized gunshot/hit/footstep/UI sound effects (zero external CDN asset dependencies).
- **Cross-Platform Controls**: Desktop keyboard + mouse TPS camera & ADS zoom, plus responsive mobile virtual joystick & touch action buttons.
- **PWA Support**: Installable as a standalone web app via Chrome / Edge / Safari.

## Project Structure

```text
.
├── .github/workflows/
│   └── deploy-pages.yml      # Automatic GitHub Pages deployment workflow
├── public/                   # Static icons & uploaded assets
│   ├── assets/aistudio/
│   ├── apple-touch-icon.png
│   ├── icon.svg
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   └── pwa-maskable-512x512.png
├── src/
│   ├── components/           # Lobby, Game HUD, Minimap, Match End, PWA Install UI
│   ├── game/                 # Three.js engine, 3D models, terrain, textures, audio, weapons, types
│   ├── hooks/                # Custom React hooks (PWA install prompt)
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Controls

| Action | Desktop | Mobile / Touch |
| --- | --- | --- |
| Move | `W` `A` `S` `D` | Left Virtual Joystick |
| Rotate Camera | Mouse / Drag | Touch Drag (Right Side) |
| Fire | Left Click | Fire Button |
| Aim / Scope (ADS) | Right Click | Scope Button |
| Sprint / Auto-Run | `Shift` | Run Button |
| Jump | `Space` | Jump Button |
| Crouch / Prone | `C` / `Z` | Crouch / Prone Buttons |
| Reload / Medkit / Gloo Wall | `R` / `H` / `G` | HUD Action Buttons |
| Switch Weapon / Melee | `1` `2` `3` | Weapon Slot Bar |
| Pick Up Loot / Cut Chute | `F` / `E` | Context Action Button |

## Run Locally

### Prerequisites

- **Node.js** `v18+` (recommended `v20` or `v22`)
- **npm** `v9+`

### Steps

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser.

### Build & Lint

```bash
npm run lint    # TypeScript check
npm run build   # Production build into dist/
npm run preview # Preview production build locally
```

## Deploy to GitHub Pages

This repository includes `.github/workflows/deploy-pages.yml`, which automatically builds and publishes the game to GitHub Pages.

1. Push this project to a GitHub repository (`main` or `master` branch).
2. Open your repository on GitHub and go to **Settings -> Pages**.
3. Under **Build and deployment -> Source**, select **GitHub Actions**.
4. Wait ~1–2 minutes for the **Deploy Bermuda Strike 3D to GitHub Pages** workflow to finish under the **Actions** tab.
5. Your game will be live at:
   `https://<your-username>.github.io/<your-repository-name>/`

### Manual Base Path Build (Optional)

If deploying under a custom subpath manually:

```bash
VITE_BASE_PATH=/your-repo-name/ npm run build
```
