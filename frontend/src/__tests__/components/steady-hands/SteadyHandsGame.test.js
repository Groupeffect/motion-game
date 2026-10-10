import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SteadyHandsGame from '@/components/steady-hands/SteadyHandsGame.vue'
import { useRepo } from 'pinia-orm'

// ── Mock pinia-ORM ──────────────────────────────────────────────

const mockRecords = new Map()

vi.mock('pinia-orm', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useRepo: vi.fn(() => ({
      find: vi.fn((key) => mockRecords.get(key) ?? null),
      save: vi.fn((record) => {
        mockRecords.set(record.id, { ...record })
      })
    }))
  }
})

// ── Mock child components ───────────────────────────────────────

const MockStartScreen = {
  template: '<div id="start-screen"><button @click="$emit(\'start\')">Start</button></div>'
}
const MockGameHUD = { template: '<div id="game-hud"></div>' }
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

describe('SteadyHandsGame', () => {
  beforeEach(() => {
    mockRecords.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders start screen initially', () => {
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

    expect(wrapper.find('#start-screen').exists()).toBe(true)
    expect(wrapper.find('#game-hud').exists()).toBe(false)
    expect(wrapper.find('#game-over-screen').exists()).toBe(false)
  })

  it('transitions from start to countdown on handleStart', async () => {
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
    await Promise.resolve() // flush microtasks

    expect(wrapper.vm.screen).toBe('countdown')
  })

  it('runs countdown sequence: 3 → 2 → 1 → GO → playing', async () => {
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

  it('starts the game with HP 100 when countdown finishes', async () => {
    createMockRecord({ hp: 50, running: true })

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

    const record = useRepo().find('session')
    expect(record.running).toBe(true)
    expect(record.hp).toBe(100)
    expect(record.hpColorClass).toBe('green')
  })

  it('processes motion data and reduces HP based on deviation', () => {
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

    // deviation = sqrt(0.5^2 + 0.5^2) ≈ 0.707
    // damage = 0.707 * 0.15 ≈ 0.106, regen = 0.033
    wrapper.vm.processMotion({ x: 0.5, y: 0.5, z: 0 })

    const record = useRepo().find('session')
    expect(record.hp).toBeLessThan(100)
    expect(record.hp).toBeGreaterThan(99)
  })

  it('changes HP color class based on HP thresholds', () => {
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

    // High HP → green
    wrapper.vm.processMotion({ x: 0, y: 0 })
    let record = useRepo().find('session')
    expect(record.hpColorClass).toBe('green')

    // Damage ~2.09 per call (sqrt(200)*0.15 - 0.033). ~19 calls to drop below 60.
    for (let i = 0; i < 20; i++) {
      wrapper.vm.processMotion({ x: 10, y: 10 })
    }
    record = useRepo().find('session')
    expect(record.hpColorClass).toBe('orange')

    // ~29 more calls to drop below 30
    for (let i = 0; i < 30; i++) {
      wrapper.vm.processMotion({ x: 10, y: 10 })
    }
    record = useRepo().find('session')
    expect(record.hpColorClass).toBe('red')
  })

  it('transitions to gameover when HP reaches 0', async () => {
    createMockRecord({ hp: 0.1, running: true, baseX: 0, baseY: 0 })

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

    // endGame sets screen to 'gameover' after 3s setTimeout
    vi.advanceTimersByTime(3000)
    await Promise.resolve()

    expect(wrapper.vm.screen).toBe('gameover')
    expect(wrapper.find('#game-over-screen').exists()).toBe(true)
  })

  it('clamps HP between 0 and 100', () => {
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

    // Zero deviation — only regeneration (should clamp at 100)
    wrapper.vm.processMotion({ x: 0, y: 0 })

    let record = useRepo().find('session')
    expect(record.hp).toBe(100)

    // Do heavy damage to test lower clamp
    for (let i = 0; i < 100; i++) {
      wrapper.vm.processMotion({ x: 100, y: 100 })
    }
    record = useRepo().find('session')
    expect(record.hp).toBe(0)
  })

  it('sets feedback intensity based on motion deviation', () => {
    createMockRecord({ hp: 50, running: true, baseX: 0, baseY: 0 })

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

    wrapper.vm.processMotion({ x: 2, y: 2 })

    const record = useRepo().find('session')
    // deviation = sqrt(4 + 4) ≈ 2.828
    expect(record.feedbackIntensity).toBeGreaterThan(0)
  })

  it('handles restart: goes back to start screen', async () => {
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

    wrapper.vm.handleRestart()

    expect(wrapper.vm.screen).toBe('start')
  })

  it('does not process motion when game is not running', () => {
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
    wrapper.vm.processMotion({ x: 10, y: 10 })

    const record = useRepo().find('session')
    expect(record.hp).toBe(initialHP)
  })

  it('caps HP at 100 when regenerating', () => {
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

    // Zero deviation — only regeneration (should clamp at 100)
    wrapper.vm.processMotion({ x: 0, y: 0 })

    const record = useRepo().find('session')
    expect(record.hp).toBe(100)
  })

  it('tracks survival time on game over', async () => {
    createMockRecord({
      hp: 0.1,
      running: true,
      startTime: 1000000,
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

    // Advance past the 3s gameover delay
    vi.advanceTimersByTime(3000)
    await Promise.resolve()

    const record = useRepo().find('session')
    expect(record.running).toBe(false)
    // survivalTime = (Date.now() - startTime) / 1000
    const expected = ((Date.now() - 1000000) / 1000).toFixed(1)
    expect(parseFloat(record.survivalTime)).toBeGreaterThan(0)
  })
})
