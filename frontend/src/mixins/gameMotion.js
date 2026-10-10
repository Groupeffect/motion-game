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

      // Notify component that fresh sensor data is available
      if (typeof this.onMotionData === 'function') {
        this.onMotionData({ x, y, z })
      }
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
  mounted() {
    this.installMotionListener()
  },
  created() {}
}
