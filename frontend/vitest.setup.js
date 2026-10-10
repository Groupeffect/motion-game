import { vi } from 'vitest'

// Mock DeviceMotionEvent (not available in JSDOM)
globalThis.DeviceMotionEvent = class DeviceMotionEvent {
  constructor() {
    this.acceleration = { x: 0, y: 0, z: 0 }
    this.accelerationIncludingGravity = { x: 0, y: 0, z: 0 }
  }
  static requestPermission = vi.fn(() => Promise.resolve('granted'))
}

// Mock AudioContext
const mockAudioContext = vi.fn(() => ({
  createOscillator: () => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { value: 440 }
  }),
  createGain: () => ({
    connect: vi.fn(),
    gain: { value: 0.5, exponentialRampToValueAtTime: vi.fn() }
  }),
  destination: {},
  state: 'running',
  currentTime: 0,
  resume: () => Promise.resolve()
}))
globalThis.AudioContext = mockAudioContext
globalThis.webkitAudioContext = mockAudioContext

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})
