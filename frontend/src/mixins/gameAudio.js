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
      } catch (e) {
        // Audio error - ignored
      }
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
      } catch (e) {
        // Audio error - ignored
      }
    }
  },
  mounted() {},
  created() {}
}
