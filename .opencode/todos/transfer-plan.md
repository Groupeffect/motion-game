# Steady Hands — Vue 3 Migration Plan

## Goal
Migrate the vanilla HTML/JS "Steady Hands" motion-sensor game into the existing Vue 3 project, following the **existing codebase patterns**.

---

## Existing Project Patterns (must match)

| Pattern | Convention in this project |
|---|---|
| **Component API** | Options API — `export default { name, components, mixins, props, data, computed, methods, mounted, created }` |
| **Script block** | `<script>` (not `<script setup>`) |
| **Style block** | `<style>` (not scoped by default, global OK) |
| **Component naming** | `name: 'ComponentName'` property |
| **Sub-components** | `components:{}` object (imported locally) |
| **Mixins** | `mixins:[]` array |
| **Props** | `props: { propName: Type }` |
| **Route lazy-loading** | `component: function () { return import(/* webpackChunkName */ 'path') }` |
| **Store / Game Data** | **Pinia-ORM Model** — `class GameData extends Model`, accessed via `useRepo(GameData)` |
| **Model pattern** | `static entity = 'gameData'`, `static fields() { return { id: this.uid(), key: this.string(''), value: this.attr(null) } }` |
| **Router** | `createRouter({ history: createWebHashHistory(), routes })` |

---

## Architecture

```
frontend/src/
├── mixins/
│   ├── gameMotion.js            # DeviceMotion permission, listener, data processing (Options API mixin)
│   └── gameAudio.js             # AudioContext, beeps, alarms (Options API mixin)
├── models/
│   └── GameData.js              # Pinia-ORM model: hp, timer, baseX/Y, feedback (reactive via useRepo)
├── components/steady-hands/
│   ├── SteadyHandsGame.vue      # Parent orchestrator (Options API, imports children)
│   ├── StartScreen.vue          # Title, instructions, start button (Options API)
│   ├── GameHUD.vue              # HUD wrapper — composes HPBarContainer + HPText (Options API)
│   ├── HPBarContainer.vue       # HP bar outer container (80% width, max 300px) (Options API)
│   ├── HPBarFill.vue            # HP bar fill with dynamic color class (Options API)
│   ├── HPText.vue               # HP text "87 / 100" (Options API)
│   ├── CountdownOverlay.vue     # 3-2-1-GO countdown (Options API)
│   ├── FeedbackOverlay.vue      # Red glow damage effect (Options API)
│   └── GameOverScreen.vue       # Survival time, restart button (Options API)
├── views/
│   └── SteadyHandsView.vue      # Route wrapper (Options API)
└── router/index.js              # Add /steady-hands route (match pattern)
```

---

## Step-by-Step Implementation

### Step 1 — Pinia-ORM Game Model (`frontend/src/models/GameData.js`)

**Match pattern:** Same as existing `Interface.js` and `gameplay.js` — extends `Model` from `pinia-orm`.

**Model:**
```js
import { Model } from 'pinia-orm'

export default class GameData extends Model {
  static entity = 'gameData'

  static fields() {
    return {
      id: this.attr('session'),
      hp: this.number(100),
      running: this.boolean(false),
      startTime: this.number(0),
      baseX: this.number(0),
      baseY: this.number(0),
      survivalTime: this.string('0'),
      feedbackIntensity: this.number(0),
      hpColorClass: this.string('green')
    }
  }
}
```

**Usage in components (replace Pinia store access):**
```js
// Instead of: const store = useGameStore()
// Use:
import { useRepo } from 'pinia-orm'
import GameData from '@/models/GameData.js'

// Get current game record (computed)
getRecord() {
  return useRepo(GameData).find('session')
}

// Read HP
this.getRecord().hp  // same as store.hp

// Update HP
useRepo(GameData).where({ id: 'session' }).update({ hp: newHp })

// Get all records (reactive, can be used in computed)
const allRecords = useRepo(GameData).all()
```

**Actions as component methods (called from SteadyHandsGame):**
- `resetGame()` — `useRepo(GameData).save({ id: 'session', hp: 100, running: false, startTime: 0, baseX: 0, baseY: 0, survivalTime: '0', feedbackIntensity: 0, hpColorClass: 'green' })`
- `startGame()` — reset first, then `startTime = Date.now()`, `running = true`
- `endGame()` — `running = false`, calc `survivalTime`
- `processMotionEvent(acc)` — read x/y, compute deviation, apply damage, regen HP, clamp, update color class
- `updateFeedback(intensity)` — set `feedbackIntensity`
- `setBase(x, y)` — set `baseX`, `baseY`

**HP Color Logic (inside `processMotionEvent`):**
- `hp > 60` → `hpColorClass = 'green'`
- `hp > 30` → `hpColorClass = 'orange'`
- `hp <= 30` → `hpColorClass = 'red'`

**Damage Formula:**
```
deviation = sqrt((x - baseX)² + (y - baseY)²)
damage = deviation * 0.15
hp -= damage (only if damage > 0.05)
hp += 0.033 (regeneration per tick)
hp = clamp(0, 100)
```

**Reactive rendering:** Components use `useRepo(GameData).where({ id: 'session' }).get()` in `computed` properties. Pinia-ORM automatically triggers re-renders when the record changes.

---

### Step 2 — Motion Sensor Mixin (`frontend/src/mixins/gameMotion.js`)

**Pattern:** Options API mixin, same structure as `MainMixin.js` — `export default { name, data, computed, methods, mounted, created }`.

**Mixin:**
```js
import { ref } from 'vue'

export default {
  name: 'gameMotion',
  data: () => ({
    gotMotionData: false,
    lastAcc: { x: null, y: null, z: null },
    isSupported: typeof DeviceMotionEvent !== 'undefined',
    _motionListenerInstalled: false
  }),
  computed: {},
  methods: {
    async requestMotionPermission() {
      if (typeof DeviceMotionEvent === 'undefined') {
        return { success: false, reason: 'unsupported' }
      }
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
          const permission = await DeviceMotionEvent.requestPermission()
          if (permission === 'granted') return { success: true, reason: 'granted' }
          return { success: false, reason: 'denied' }
        } catch (error) {
          return { success: false, reason: 'error' }
        }
      }
      return { success: true, reason: 'browser-managed' }
    },

    installMotionListener() {
      if (this._motionListenerInstalled) return
      this._motionListenerInstalled = true
      window.addEventListener('devicemotion', this.handleMotionData, { passive: true })
    },

    handleMotionData(event) {
      const acc = event.accelerationIncludingGravity || event.acceleration
      if (!acc) return

      const x = acc.x
      const y = acc.y
      const z = acc.z

      if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
        return
      }

      this.gotMotionData = true
      this.lastAcc.x = x
      this.lastAcc.y = y
      this.lastAcc.z = typeof z === 'number' ? z : null
    },

    waitForSensor(timeout = 5000) {
      return new Promise(resolve => {
        if (this.gotMotionData) { resolve(true); return }
        const start = Date.now()
        const check = setInterval(() => {
          if (this.gotMotionData) { clearInterval(check); resolve(true); return }
          if (Date.now() - start >= timeout) { clearInterval(check); resolve(false) }
        }, 100)
      })
    }
  },
  mounted() {},
  created() {}
}
```

**Key:** Data properties (`gotMotionData`, `lastAcc`) are reactive. Methods like `requestMotionPermission`, `installMotionListener`, `waitForSensor` become available as `this.requestMotionPermission()` in any component that uses this mixin.

---

### Step 3 — Audio Mixin (`frontend/src/mixins/gameAudio.js`)

**Pattern:** Options API mixin, same structure as `MainMixin.js`.

**Mixin:**
```js
export default {
  name: 'gameAudio',
  data: () => ({
    audioCtx: null
  }),
  computed: {},
  methods: {
    initAudio() {
      try {
        if (!this.audioCtx) {
          this.audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        }
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {})
        }
      } catch (e) {
        console.warn('Audio not available:', e)
      }
    },

    playBeep(freq, duration, type = 'sine', volume = 0.5) {
      if (!this.audioCtx) return
      try {
        const osc = this.audioCtx.createOscillator()
        const gain = this.audioCtx.createGain()
        osc.type = type
        osc.frequency.value = freq
        gain.gain.value = volume
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration)
        osc.connect(gain)
        gain.connect(this.audioCtx.destination)
        osc.start()
        osc.stop(this.audioCtx.currentTime + duration)
      } catch (e) {}
    },

    playCountdownBeep() { this.playBeep(800, 0.2, 'sine', 0.6) },
    playGoBeep() { this.playBeep(1200, 0.4, 'sine', 0.7) },

    playDamageSound(deviation) {
      const vol = Math.min(0.4, deviation * 0.1)
      this.playBeep(150 + Math.random() * 100, 0.1, 'sawtooth', vol)
    },

    playDeathAlarm() {
      if (!this.audioCtx) return
      try {
        const osc = this.audioCtx.createOscillator()
        const gain = this.audioCtx.createGain()
        osc.type = 'square'
        osc.frequency.value = 440
        gain.gain.value = 0.5
        osc.connect(gain)
        gain.connect(this.audioCtx.destination)
        osc.start()
        osc.stop(this.audioCtx.currentTime + 3)
      } catch (e) {}
    }
  },
  mounted() {},
  created() {}
}
```

**Key:** Methods like `initAudio()`, `playCountdownBeep()`, `playDeathAlarm()` become available as `this.initAudio()` in any component that uses this mixin.

---

### Step 4 — Components (Options API — match existing patterns)

#### `StartScreen.vue`
```js
export default {
  name: 'StartScreen',
  components: {},
  mixins: [],
  props: { onStart: { type: Function, required: true } },
  data: () => ({}),
  computed: {},
  methods: {
    onStartClick() { this.onStart() }
  },
  mounted() {},
  created() {}
}
```
Template: h1 "🤲 Steady Hands", description text, green start button. Styles: centered flex, dark bg `#0d1117`, from original CSS.

#### `GameHUD.vue`
```js
import HPBarContainer from './HPBarContainer.vue'
import HPText from './HPText.vue'

export default {
  name: 'GameHUD',
  components: { HPBarContainer, HPText },
  mixins: [],
  props: {
    hp: { type: Number, default: 100 },
    hpColorClass: { type: String, default: 'green' }
  },
  data: () => ({}),
  computed: {},
  methods: {},
  mounted() {},
  created() {}
}
```
Template: `<HPBarContainer :hp="hp" :hp-color-class="hpColorClass" /><HPText :hp="hp" />`

#### `HPBarContainer.vue`
```js
import HPBarFill from './HPBarFill.vue'

export default {
  name: 'HPBarContainer',
  components: { HPBarFill },
  mixins: [],
  props: {
    hp: { type: Number, default: 100 },
    hpColorClass: { type: String, default: 'green' }
  },
  data: () => ({}),
  computed: {},
  methods: {},
  mounted() {},
  created() {}
}
```
Template: Outer container `position: fixed; top: 20px; left: 50%; transform: translateX(-50%); width: 80%; max-width: 300px; height: 24px; background: #21262d; border-radius: 12px; overflow: hidden; border: 2px solid #30363d`. Contains `<HPBarFill>`.

#### `HPBarFill.vue`
```js
export default {
  name: 'HPBarFill',
  components: {},
  mixins: [],
  props: {
    hp: { type: Number, default: 100 },
    hpColorClass: { type: String, default: 'green' }
  },
  data: () => ({}),
  computed: {
    barWidth() { return this.hp + '%' },
    gradientClass() {
      if (this.hp > 60) return 'hp-green'
      if (this.hp > 30) return 'hp-orange'
      return 'hp-red'
    }
  },
  methods: {},
  mounted() {},
  created() {}
}
```
Template: `<div class="hp-fill" :style="{ width: barWidth }" :class="gradientClass" />`

Styles: `.hp-fill { height: 100%; border-radius: 10px; transition: width 0.1s linear; }` + color classes.

#### `HPText.vue`
```js
export default {
  name: 'HPText',
  components: {},
  mixins: [],
  props: {
    hp: { type: Number, default: 100 }
  },
  data: () => ({}),
  computed: {
    displayText() { return Math.ceil(this.hp) + ' / 100' }
  },
  methods: {},
  mounted() {},
  created() {}
}
```
Template: `<div id="hp-text">{{ displayText }}</div>` with `position: fixed; top: 48px; left: 50%; transform: translateX(-50%); font-size: 0.9rem; color: #8b949e;`

#### `CountdownOverlay.vue`
```js
export default {
  name: 'CountdownOverlay',
  components: {},
  mixins: [],
  props: {
    visible: { type: Boolean, default: false },
    value: { type: String, default: '' }
  },
  emits: ['gone'],
  data: () => ({}),
  computed: {},
  methods: {},
  mounted() {},
  created() {}
}
```
Template: Full-screen overlay `rgba(13,17,23,0.9)`, large bold text (5rem). Emits `gone` when done.

#### `FeedbackOverlay.vue`
```js
export default {
  name: 'FeedbackOverlay',
  components: {},
  mixins: [],
  props: {
    intensity: { type: Number, default: 0 }
  },
  data: () => ({}),
  computed: {
    boxShadowStyle() {
      const a = Math.min(0.4, this.intensity * 0.05)
      const p = this.intensity * 10
      return a > 0.01 ? `inset 0 0 ${p}px rgba(248,81,73,${a})` : 'none'
    }
  },
  methods: {},
  mounted() {},
  created() {}
}
```
Template: Fixed overlay `pointer-events: none`, inline `box-shadow` from computed.

#### `GameOverScreen.vue`
```js
export default {
  name: 'GameOverScreen',
  components: {},
  mixins: [],
  props: {
    survivalTime: { type: String, default: '0' },
    onRestart: { type: Function, required: true }
  },
  data: () => ({}),
  computed: {},
  methods: {
    onRestartClick() { this.onRestart() }
  },
  mounted() {},
  created() {}
}
```
Template: "💀 Game Over", time display, green restart button. Dark semi-transparent bg.

#### `SteadyHandsGame.vue` (Parent Orchestrator)
```js
import { useRepo } from 'pinia-orm'
import GameData from '@/models/GameData.js'
import gameMotion from '@/mixins/gameMotion.js'
import gameAudio from '@/mixins/gameAudio.js'
import StartScreen from './StartScreen.vue'
import GameHUD from './GameHUD.vue'
import HPBarContainer from './HPBarContainer.vue'
import HPBarFill from './HPBarFill.vue'
import HPText from './HPText.vue'
import CountdownOverlay from './CountdownOverlay.vue'
import FeedbackOverlay from './FeedbackOverlay.vue'
import GameOverScreen from './GameOverScreen.vue'

export default {
  name: 'SteadyHandsGame',
  components: {
    StartScreen, GameHUD, HPBarContainer, HPBarFill, HPText,
    CountdownOverlay, FeedbackOverlay, GameOverScreen
  },
  mixins: [gameMotion, gameAudio],
  data: () => ({
    screen: 'start',       // 'start' | 'countdown' | 'playing' | 'gameover'
    countdownValue: '',
    countdownTimer: null,
    warningTimer: null
  }),
  computed: {
    game() {
      return useRepo(GameData).find('session') || {}
    },
    // Reactive access — Pinia-ORM auto-triggers re-render
    hp() { return this.game.hp || 0 },
    running() { return this.game.running || false },
    survivalTime() { return this.game.survivalTime || '0' },
    hpColorClass() { return this.game.hpColorClass || 'green' },
    feedbackIntensity() { return this.game.feedbackIntensity || 0 }
  },
  methods: {
    async handleStart() {
      this.initAudio()

      // Install sensor listener BEFORE permission request
      this.installMotionListener()

      // Request iOS permission
      const permission = await this.requestMotionPermission()
      if (!permission.success) { /* alert + return */ return }

      // Wait for sensor data
      const sensorAvailable = await this.waitForSensor(5000)
      if (!sensorAvailable) {
        // Show warning (non-blocking)
      }

      // Start countdown
      this.screen = 'countdown'
      this.runCountdown()
    },

    runCountdown() {
      const sequence = ['3', '2', '1', 'GO', '']
      let i = 0

      this.countdownTimer = setInterval(() => {
        if (i < sequence.length) {
          this.countdownValue = sequence[i]
          if (sequence[i] !== 'GO') this.playCountdownBeep()
          else this.playGoBeep()
          i++
        } else {
          clearInterval(this.countdownTimer)
          this.countdownValue = ''
          this.startGame()
          this.screen = 'playing'
          this.setInitialBase()

          // Warn if no data after 3s
          this.warningTimer = setTimeout(() => {
            if (this.screen === 'playing' && !this.gotMotionData) {
              // show warning
            }
          }, 3000)
        }
      }, 1000)
    },

    startGame() {
      const repo = useRepo(GameData)
      // Ensure record exists
      let record = repo.find('session')
      if (!record) {
        record = { id: 'session' }
      }
      // Reset
      Object.assign(record, {
        hp: 100,
        running: true,
        startTime: Date.now(),
        baseX: record.baseX || 0,
        baseY: record.baseY || 0,
        survivalTime: '0',
        feedbackIntensity: 0,
        hpColorClass: 'green'
      })
      repo.save(record)
    },

    endGame() {
      const repo = useRepo(GameData)
      const record = repo.find('session')
      if (!record) return
      record.running = false
      record.survivalTime = ((Date.now() - record.startTime) / 1000).toFixed(1)
      repo.save(record)
    },

    setInitialBase() {
      if (this.lastAcc.x !== null && this.lastAcc.y !== null) {
        this.saveBase(this.lastAcc.x, this.lastAcc.y)
      }
    },

    saveBase(x, y) {
      const repo = useRepo(GameData)
      const record = repo.find('session')
      if (record) {
        record.baseX = x
        record.baseY = y
        repo.save(record)
      }
    },

    processMotion(acc) {
      const repo = useRepo(GameData)
      const record = repo.find('session')
      if (!record || !record.running) return

      const dx = acc.x - record.baseX
      const dy = acc.y - record.baseY
      const deviation = Math.sqrt(dx * dx + dy * dy)
      const damage = deviation * 0.15

      if (damage > 0.05) {
        record.hp -= damage
        // Trigger sound via event or composable
      }

      record.hp += 0.033
      record.hp = Math.max(0, Math.min(100, record.hp))
      record.feedbackIntensity = deviation

      // HP color
      if (record.hp > 60) record.hpColorClass = 'green'
      else if (record.hp > 30) record.hpColorClass = 'orange'
      else record.hpColorClass = 'red'

      repo.save(record)

      if (record.hp <= 0) {
        this.endGame()
      }
    },

    handleMotion(event) {
      if (this.screen !== 'playing') return
      const acc = event.accelerationIncludingGravity || event.acceleration
      if (!acc) return
      this.processMotion(acc)
    },

    handleRestart() {
      if (this.countdownTimer) clearInterval(this.countdownTimer)
      this.screen = 'start'
    },

    onGameOverScreenVisible() {
      this.playDeathAlarm()
    }
  },
  mounted() {},
  created() {}
}
```

Template:
```html
<template>
  <div id="steady-hands-game">
    <StartScreen v-if="screen === 'start'" @start="handleStart" />

    <template v-else>
      <GameHUD v-if="screen === 'playing'" :hp="hp" :hp-color-class="hpColorClass" />
      <CountdownOverlay v-if="screen === 'countdown'" :visible="true" :value="countdownValue" />
      <FeedbackOverlay v-if="screen === 'playing'" :intensity="feedbackIntensity" />

      <GameOverScreen
        v-if="screen === 'gameover'"
        :survival-time="survivalTime"
        @restart="handleRestart"
        @visible="onGameOverScreenVisible"
      />
    </template>
  </div>
</template>
```

**Game loop:** `processMotion()` runs on every `devicemotion` event. No `requestAnimationFrame` needed — sensor events fire at the device's native rate (~60Hz). HP check triggers `endGame()` when `hp <= 0`.

#### `SteadyHandsView.vue` (Route Wrapper)
```js
import SteadyHandsGame from '@/components/steady-hands/SteadyHandsGame.vue'

export default {
  name: 'SteadyHandsView',
  components: { SteadyHandsGame },
  mixins: [],
  data: () => ({}),
  computed: {},
  methods: {},
  mounted() {},
  created() {}
}
```
Template: `<SteadyHandsGame />`

---

### Step 5 — Router Update (`frontend/src/router/index.js`)

Add route matching existing pattern:
```js
{
  path: '/steady-hands',
  name: 'SteadyHands',
  component: function () {
    return import(/* webpackChunkName: "steady-hands" */ '../views/SteadyHandsView.vue')
  }
}
```

---

### Step 6 — App.vue Nav Update

Add game link to nav:
```html
<router-link to="/">Home</router-link> |
<router-link to="/about">About</router/link> |
<router-link to="/steady-hands">Steady Hands</router-link>
```

---

### Step 7 — Global Styles

The game needs a dark background globally. Add to `App.vue`:
```css
#steady-hands-game,
.steady-hands-wrapper {
  /* game-specific global resets if needed */
}
```

Or inject via the composable/setup — sensor-based games need `overflow: hidden` and `touch-action: none` on body.

---

## File List Summary

| # | File | Pattern |
|---|---|---|
| 1 | `frontend/src/mixins/gameMotion.js` | Options API mixin (motion sensor) |
| 2 | `frontend/src/mixins/gameAudio.js` | Options API mixin (audio) |
| 3 | `frontend/src/models/GameData.js` | Pinia-ORM Model (reactive game state) |
| 4 | `frontend/src/components/steady-hands/SteadyHandsGame.vue` | Options API, composes children, uses `useRepo(GameData)` |
| 5 | `frontend/src/components/steady-hands/StartScreen.vue` | Options API |
| 6 | `frontend/src/components/steady-hands/GameHUD.vue` | Options API, composes HPBarContainer + HPText |
| 7 | `frontend/src/components/steady-hands/HPBarContainer.vue` | Options API, composes HPBarFill |
| 8 | `frontend/src/components/steady-hands/HPBarFill.vue` | Options API |
| 9 | `frontend/src/components/steady-hands/HPText.vue` | Options API |
| 10 | `frontend/src/components/steady-hands/CountdownOverlay.vue` | Options API |
| 11 | `frontend/src/components/steady-hands/FeedbackOverlay.vue` | Options API |
| 12 | `frontend/src/components/steady-hands/GameOverScreen.vue` | Options API |
| 13 | `frontend/src/views/SteadyHandsView.vue` | Options API |
| 14 | `frontend/src/router/index.js` | Edit (add route) |
| 15 | `frontend/src/App.vue` | Edit (add nav link) |

---

## Not Changed

- `main.js` — no modifications needed (Pinia-ORM already registered via plugin)
- `store/index.js` — untouched (existing counter store, no longer needed for game data)
- `mixins/MainMixin.js` — uses `useRepo()` from pinia-orm — already compatible
- `models/Interface.js` — untouched (existing model)
- `models/gameplay.js` — untouched (existing model)
- PWA config / `public/` — untouched
- Django backend integration — untouched

---

## Game Flow

```
[Start Screen]
     │ click "Start"
     ▼
[Permission Request] → iOS prompt
     │
     ▼
[Countdown: 3-2-1-GO] ← audio beeps each step
     │
     ▼
[Playing] ← HP drains on tilt, regenerates slowly
     │ HP ≤ 0?
     ├── No → keep playing
     └── Yes → wait 3s → [Game Over] → click "Restart" → [Countdown] → [Playing]
```
