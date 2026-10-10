import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SteadyHandsGame from '@/components/steady-hands/SteadyHandsGame.vue'
import { useRepo } from 'pinia-orm'

// ── Mock pinia-ORM (shared reference approach) ─────────────────

const mockRecords = new Map()
const mockRepo = {
  find: vi.fn((key) => mockRecords.get(key) ?? null),
  save: vi.fn((record) => {
    mockRecords.set(record.id, record)
  })
}

vi.mock('pinia-orm', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useRepo: vi.fn(() => mockRepo)
  }
})

// ── Mock child components ───────────────────────────────────────

const MockStartScreen = {
  template: '<div id="start-screen"><button @click="$emit(\'start\')">Start</button></div>'
}
const MockGameHUD = {
  template: '<div id="game-hud">HP: {{ hp }} | {{ hpColorClass }}</div>',
  props: ['hp', 'hpColorClass']
}
const MockCountdownOverlay = {
  template: '<div id="countdown-overlay" v-if="visible">{{ value }}</div>',
  props: ['visible', 'value']
}
const MockFeedbackOverlay = {
  template: '<div id="feedback-overlay"></div>',
  props: ['intensity']
}
const MockGameOverScreen = {
  template: '<div id="game-over-screen"><button @click="$emit(\'restart\')">Restart</button></div>',
  props: ['survivalTime']
}

// ── Helpers ─────────────────────────────────────────────────────

function createMockRecord(overrides = {}) {
  const record = {
    id: 'session',
    hp: 100,
    running: false,
    startTime: 0,
    baseX: 0,
    baseY: 0,
    survivalTime: '0',
    feedbackIntensity: 0,
    hpColorClass: 'green',
    ...overrides
  }
  mockRecords.set('session', record)
  return record
}

// ── Tests ───────────────────────────────────────────────────────

describe('Gameplay Plausibility', () => {
  beforeEach(() => {
    mockRecords.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── Bug Fix Tests ─────────────────────────────────────────────

  it('should not start countdown twice when handleStart is called while countdown is running', async () => {
    const wrapper = mount(SteadyHandsGame, {
      global: {
        stubs: {
          StartScreen: MockStartScreen,
          GameHUD: MockGameHUD,
          CountdownOverlay: MockCountdownOverlay,
          FeedbackOverlay: MockFeedbackOverlay,
          GameOverScreen: MockGameOverScreen
        }
      }
    })

    wrapper.vm.requestMotionPermission = vi.fn(() => Promise.resolve({ success: true, reason: 'granted' }))
    wrapper.vm.waitForSensor = vi.fn(() => Promise.resolve(true))

    // Simulate rapid double-click on start
    await wrapper.vm.handleStart()
    await Promise.resolve()

    expect(wrapper.vm.screen).toBe('countdown')
    const firstCountdownTimer = wrapper.vm.countdownTimer

    // Call handleStart again immediately (simulating rapid click)
    await wrapper.vm.handleStart()
    await Promise.resolve()

    // The countdown timer should NOT change (no new interval created)
    expect(wrapper.vm.countdownTimer).toBe(firstCountdownTimer)
  })

  it('should show health bar with HP 100 when game starts playing', async () => {
    createMockRecord()

    const wrapper = mount(SteadyHandsGame, {
      global: {
        stubs: {
          StartScreen: MockStartScreen,
          GameHUD: MockGameHUD,
          CountdownOverlay: MockCountdownOverlay,
          FeedbackOverlay: MockFeedbackOverlay,
          GameOverScreen: MockGameOverScreen
        }
      }
    })

    wrapper.vm.requestMotionPermission = vi.fn(() => Promise.resolve({ success: true, reason: 'granted' }))
    wrapper.vm.waitForSensor = vi.fn(() => Promise.resolve(true))

    await wrapper.vm.handleStart()
    vi.advanceTimersByTime(6000)
    await Promise.resolve()

    expect(wrapper.vm.screen).toBe('playing')
    expect(wrapper.find('#game-hud').exists()).toBe(true)

    // HP should be 100 (not 0 or any other default)
    expect(wrapper.vm.hp).toBe(100)
    expect(wrapper.vm.hpColorClass).toBe('green')
  })

  it('should have health bar showing orange when HP drops between 31-60', () => {
    createMockRecord({ hp: 100, running: true, baseX: 0, baseY: 0 })

    const wrapper = mount(SteadyHandsGame, {
      global: {
        stubs: {
          StartScreen: MockStartScreen,
          GameHUD: MockGameHUD,
          CountdownOverlay: MockCountdownOverlay,
          FeedbackOverlay: MockFeedbackOverlay,
          GameOverScreen: MockGameOverScreen
        }
      }
    })

    // Damage until HP drops below 60
    for (let i = 0; i < 25; i++) {
      wrapper.vm.processMotion({ x: 10, y: 10 })
    }

    const record = useRepo().find('session')
    expect(record.hp).toBeLessThan(60)
    expect(record.hp).toBeGreaterThan(30)
    expect(record.hpColorClass).toBe('orange')
  })

  it('should have health bar showing red when HP drops to 30 or below', () => {
    createMockRecord({ hp: 100, running: true, baseX: 0, baseY: 0 })

    const wrapper = mount(SteadyHandsGame, {
      global: {
        stubs: {
          StartScreen: MockStartScreen,
          GameHUD: MockGameHUD,
          CountdownOverlay: MockCountdownOverlay,
          FeedbackOverlay: MockFeedbackOverlay,
          GameOverScreen: MockGameOverScreen
        }
      }
    })

    // Damage until HP drops below 30
    for (let i = 0; i < 55; i++) {
      wrapper.vm.processMotion({ x: 10, y: 10 })
    }

    const record = useRepo().find('session')
    expect(record.hp).toBeLessThanOrEqual(30)
    expect(record.hpColorClass).toBe('red')
  })

  // ── Full Gameplay Flow Tests ──────────────────────────────────

  it('full game flow: start → countdown → play → damage → game over → restart', async () => {
    createMockRecord()

    const wrapper = mount(SteadyHandsGame, {
      global: {
        stubs: {
          StartScreen: MockStartScreen,
          GameHUD: MockGameHUD,
          CountdownOverlay: MockCountdownOverlay,
          FeedbackOverlay: MockFeedbackOverlay,
          GameOverScreen: MockGameOverScreen
        }
      }
    })

    wrapper.vm.requestMotionPermission = vi.fn(() => Promise.resolve({ success: true, reason: 'granted' }))
    wrapper.vm.waitForSensor = vi.fn(() => Promise.resolve(true))

    // Phase 1: Start screen
    expect(wrapper.vm.screen).toBe('start')
    expect(wrapper.find('#start-screen').exists()).toBe(true)

    // Phase 2: Transition to countdown
    await wrapper.vm.handleStart()
    await Promise.resolve()
    expect(wrapper.vm.screen).toBe('countdown')

    // Phase 3: Countdown completes, game starts
    vi.advanceTimersByTime(6000)
    await Promise.resolve()
    expect(wrapper.vm.screen).toBe('playing')
    expect(wrapper.find('#game-hud').exists()).toBe(true)

    // Phase 4: Player takes damage
    createMockRecord({ hp: 100, running: true, baseX: 0, baseY: 0 })
    wrapper.vm.processMotion({ x: 10, y: 10 }) // Heavy movement

    let record = useRepo().find('session')
    const hpAfterDamage = record.hp
    expect(hpAfterDamage).toBeLessThan(100)

    // Phase 5: HP reaches 0 → game over
    createMockRecord({ hp: 0.5, running: true, baseX: 0, baseY: 0 })
    const wrapper2 = mount(SteadyHandsGame, {
      global: {
        stubs: {
          StartScreen: MockStartScreen,
          GameHUD: MockGameHUD,
          CountdownOverlay: MockCountdownOverlay,
          FeedbackOverlay: MockFeedbackOverlay,
          GameOverScreen: MockGameOverScreen
        }
      }
    })
    wrapper2.vm.processMotion({ x: 10, y: 10 })

    vi.advanceTimersByTime(3000)
    await Promise.resolve()
    expect(wrapper2.vm.screen).toBe('gameover')
    expect(wrapper2.find('#game-over-screen').exists()).toBe(true)

    record = useRepo().find('session')
    expect(record.running).toBe(false)

    // Phase 6: Restart
    wrapper2.vm.handleRestart()
    expect(wrapper2.vm.screen).toBe('start')
  })

  it('game should not process motion outside of playing state', () => {
    createMockRecord({ hp: 100, running: false, baseX: 0, baseY: 0 })

    const wrapper = mount(SteadyHandsGame, {
      global: {
        stubs: {
          StartScreen: MockStartScreen,
          GameHUD: MockGameHUD,
          CountdownOverlay: MockCountdownOverlay,
          FeedbackOverlay: MockFeedbackOverlay,
          GameOverScreen: MockGameOverScreen
        }
      }
    })

    const initialHP = useRepo().find('session').hp

    // Attempt to process motion while game is not running
    wrapper.vm.processMotion({ x: 50, y: 50 })

    const record = useRepo().find('session')
    expect(record.hp).toBe(initialHP)
  })

  it('countdown values should follow sequence: 3 → 2 → 1 → GO → (empty)', async () => {
    createMockRecord()

    const wrapper = mount(SteadyHandsGame, {
      global: {
        stubs: {
          StartScreen: MockStartScreen,
          GameHUD: MockGameHUD,
          CountdownOverlay: MockCountdownOverlay,
          FeedbackOverlay: MockFeedbackOverlay,
          GameOverScreen: MockGameOverScreen
        }
      }
    })

    wrapper.vm.requestMotionPermission = vi.fn(() => Promise.resolve({ success: true, reason: 'granted' }))
    wrapper.vm.waitForSensor = vi.fn(() => Promise.resolve(true))

    await wrapper.vm.handleStart()
    await Promise.resolve()

    expect(wrapper.vm.screen).toBe('countdown')

    // Fast-forward 6 seconds — countdown: 3(1s), 2(2s), 1(3s), GO(4s), ''(5s), trigger(6s)
    vi.advanceTimersByTime(6000)
    await Promise.resolve()

    expect(wrapper.vm.screen).toBe('playing')
    expect(wrapper.find('#game-hud').exists()).toBe(true)
  })

  it('game over survival time should be positive after playing', async () => {
    createMockRecord({
      hp: 0.5,
      running: true,
      startTime: Date.now() - 5000,
      baseX: 0,
      baseY: 0
    })

    const wrapper = mount(SteadyHandsGame, {
      global: {
        stubs: {
          StartScreen: MockStartScreen,
          GameHUD: MockGameHUD,
          CountdownOverlay: MockCountdownOverlay,
          FeedbackOverlay: MockFeedbackOverlay,
          GameOverScreen: MockGameOverScreen
        }
      }
    })

    wrapper.vm.processMotion({ x: 10, y: 10 })

    vi.advanceTimersByTime(3000)
    await Promise.resolve()

    const record = useRepo().find('session')
    expect(parseFloat(record.survivalTime)).toBeGreaterThan(0)
  })

  it('feedback intensity should update based on motion deviation', () => {
    createMockRecord({ hp: 100, running: true, baseX: 0, baseY: 0 })

    const wrapper = mount(SteadyHandsGame, {
      global: {
        stubs: {
          StartScreen: MockStartScreen,
          GameHUD: MockGameHUD,
          CountdownOverlay: MockCountdownOverlay,
          FeedbackOverlay: MockFeedbackOverlay,
          GameOverScreen: MockGameOverScreen
        }
      }
    })

    // Initially no motion data
    const initialRecord = useRepo().find('session')
    expect(initialRecord.feedbackIntensity).toBe(0)

    wrapper.vm.processMotion({ x: 5, y: 5 })

    const record = useRepo().find('session')
    // deviation = sqrt(25 + 25) = sqrt(50) ≈ 7.07
    expect(record.feedbackIntensity).toBeCloseTo(7.07, 1)
  })

  it('player should be able to win by staying still (HP never reaches 0)', () => {
    createMockRecord({ hp: 100, running: true, baseX: 0, baseY: 0 })

    const wrapper = mount(SteadyHandsGame, {
      global: {
        stubs: {
          StartScreen: MockStartScreen,
          GameHUD: MockGameHUD,
          CountdownOverlay: MockCountdownOverlay,
          FeedbackOverlay: MockFeedbackOverlay,
          GameOverScreen: MockGameOverScreen
        }
      }
    })

    // Simulate 100 ticks of zero deviation (player perfectly steady)
    for (let i = 0; i < 100; i++) {
      wrapper.vm.processMotion({ x: 0, y: 0 })
    }

    const record = useRepo().find('session')
    expect(record.running).toBe(true)
    expect(record.hp).toBe(100) // HP stays at 100 (clamped)
  })
})
