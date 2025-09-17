### Phase 1 — Foundation (Week 1)
- **rAF + delta-time**: Replace `setInterval` loops; frame-rate independent movement.
- **Pause/Resume**: `P` toggle, overlay.
- **Settings persistence**: Save best, volume, difficulty in `localStorage`.
- **Responsive canvas**: DPR scaling; maintain 600×800 virtual space.

Milestone: Stable performance at 60 FPS; pause works; settings persist.

### Phase 2 — Core Gameplay (Week 2)
- **Difficulty modes**: Easy/Normal/Hard (spawn/maxActive/speed ramp presets).
- **Combo streaks**: Score multipliers + subtle slow‑mo on thresholds.
- **Power-ups**: Shield, Freeze, Bomb; drop chance on streaks.

Milestone: Three modes selectable; combos visible; power‑ups functional and balanced.

### Phase 3 — UX & Accessibility (Week 3)
- **Volume controls**: Music/SFX sliders + mute; persisted.
- **Better input UX**: Auto‑focus recovery, optional on‑screen keypad.
- **Color/contrast toggle**: Colorblind‑safe and high‑contrast themes.
- **Mobile haptics**: Vibrate on miss/correct (where supported).

Milestone: Usable on desktop and mobile; accessibility toggles verified.

### Phase 4 — Learning Features (Week 4)
- **Focused tables**: Pick ranges/pairs to practice.
- **Adaptive difficulty**: Bias spawn toward weak pairs.
- **Post‑game report**: Accuracy, avg response time, hardest pairs heatmap.
- **Tutorial**: Slower guided first game with hints.

Milestone: Player can target skills; report surfaces weaknesses.

### Phase 5 — Modes & Content (Week 5)
- **Time Attack**: Score as high as possible in N seconds.
- **Zen Practice**: No lives/score; relaxed mode.
- **Daily Challenge**: Seeded set; shareable seed.

Milestone: Mode selector; each mode has distinct rules and end screen.

### Phase 6 — City, Visuals, Juice (Week 6)
- **City HP/repair**: Earn coins to repair/upgrade buildings.
- **Themes/skins**: Unlockable palettes/asteroids; night/neon/retro.
- **Special waves**: Boss asteroids and mini‑events.
- **Polish**: Screen shake, debris variety, refined explosions.

Milestone: Visual feedback feels impactful; light progression loop.

### Phase 7 — Progression & Social (Week 7–8)
- **Achievements**: Local badges and milestones.
- **Profiles**: Multiple player slots.
- **Leaderboards**: Local; optional cloud later.

Milestone: Replayability via goals; scores comparable within device.

### Technical Backlog (ongoing)
- **Refactor to modules**: Split `game.js` into rendering, input, state, audio.
- **State machine**: Menus, gameplay, pause, game over, reports, modes.
- **Test hooks/telemetry**: Simple timers to evaluate response times and spawn balance.

### Risk & Dependencies
- Adaptive difficulty depends on analytics from reports.
- City upgrades depend on coin economy introduced in Phase 6.
- Online leaderboards require backend; keep optional.

### Suggested implementation order (MVP path)
1) Phase 1 → 2 → 3 (ship MVP+), then 4 (learning), 5 (modes), 6 (juice), 7 (social).
