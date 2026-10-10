# Steady Hands – Game Rules

## Overview
Hold your phone as steady as possible. Tilt and vibration drain your health.
Health regenerates slowly. The goal is to survive as long as you can.

## How to Play
1. Tap **Start** to begin.
2. A **3-2-1 countdown** appears.
3. The game captures your current phone orientation as the **baseline**.
4. Hold your phone as still as possible.
5. Survive as long as you can!

## Health System
| Aspect | Detail |
|---|---|
| **Max HP** | 100 |
| **Damage** | Proportional to how far the accelerometer reading deviates from the baseline (× 0.15) |
| **Minimum damage threshold** | Deviation must exceed 0.05 to deal damage |
| **Regeneration** | +0.033 HP per sensor update (≈ 2 Hz) |
| **HP bar colors** | 🟢 Green (> 60) · 🟡 Yellow (> 30) · 🔴 Red (≤ 30) |

## Game Over
- When HP reaches **0**, the game ends.
- A death alarm plays, and your **survival time** (in seconds) is displayed.
- Tap **Play Again** to restart.

## Controls
- **No buttons or gestures** – just hold your phone steady.
- The game uses your phone's **accelerometer** (device motion sensor).

## Requirements & Permissions
- A device with a **motion sensor** (accelerometer) is required.
- **iOS / Safari**: You must explicitly grant *Motion & Orientation* permission when prompted.
- **Android / Chrome**: Permission is managed by the browser; no extra prompt is needed.
- If no sensor data is received, a warning appears at the bottom of the screen.

## Feedback
| Type | Description |
|---|---|
| **Visual** | A red glow appears on the screen edges proportional to the damage being taken |
| **Audio** | Countdown beeps (800 Hz), a "Go!" beep (1200 Hz), random damage buzzes, and a 3-second death alarm |

## Tips
- Find a comfortable, stable grip before the countdown ends.
- Keep your arms close to your body to reduce micro-tremors.
- A table or your knees can help steady your hands.   