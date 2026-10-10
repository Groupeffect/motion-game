/**
 * Device & Sensor capabilities detector
 * Works in PWA mode, installed apps, and GitHub Pages.
 */

export default {
  name: 'deviceSensor',
  data: () => ({
    platform: 'unknown',
    userAgent: '',
    isPWA: false,
    isStandalone: false,
    isHTTPS: false,
    isSecureContext: false,
    errors: [],
    warnings: [],
    sensors: null,
    motionPermission: 'unknown',
    permissions: {},
  }),
  async created() {
    this.detectPlatform()
    this.detectEnvironment()
    await this.detectPermissions()
    await this.detectSensors()
  },
  methods: {
    detectPlatform() {
      const ua = navigator.userAgent || ''
      this.userAgent = ua

      if (/iPhone|iPad|iPod/.test(ua)) this.platform = 'iOS'
      else if (/Android/.test(ua)) this.platform = 'Android'
      else if (/Mac/.test(ua)) this.platform = 'macOS'
      else if (/Linux/.test(ua)) this.platform = 'Linux'
      else if (/Windows/.test(ua)) this.platform = 'Windows'
      else this.platform = 'Other'
    },

    detectEnvironment() {
      this.isHTTPS = location.protocol === 'https:'
      this.isSecureContext = window.isSecureContext
      this.isStandalone = window.matchMedia('(display-mode: standalone)').matches
      // PWA = standalone OR has service worker registered
      this.isPWA = this.isStandalone || ('serviceWorker' in navigator)
    },

    async detectPermissions() {
      if (!navigator.permissions) {
        this.warnings.push('Permissions API not available')
        return
      }

      try {
        const motionResult = await navigator.permissions.query({ name: 'accelerometer' })
        this.permissions.accelerometer = motionResult.state
        motionResult.addEventListener('change', () => {
          this.permissions.accelerometer = motionResult.state
        })
      } catch {
        this.permissions.accelerometer = 'unavailable'
      }

      try {
        const gyroResult = await navigator.permissions.query({ name: 'gyroscope' })
        this.permissions.gyroscope = gyroResult.state
        gyroResult.addEventListener('change', () => {
          this.permissions.gyroscope = gyroResult.state
        })
      } catch {
        this.permissions.gyroscope = 'unavailable'
      }

      try {
        const orientResult = await navigator.permissions.query({ name: 'device-orientation' })
        this.permissions['device-orientation'] = orientResult.state
        orientResult.addEventListener('change', () => {
          this.permissions['device-orientation'] = orientResult.state
        })
      } catch {
        this.permissions['device-orientation'] = 'unavailable'
      }

      // iOS motion permission
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        this.motionPermission = 'required'
        this.warnings.push('iOS: motion permission required (tap to request)')
      } else if (typeof DeviceMotionEvent !== 'undefined') {
        this.motionPermission = 'granted'
      }
    },

    async detectSensors() {
      this.sensors = { motion: null, orientation: null, gyroscope: null, accelerometer: null }

      // Device Motion
      const hasMotion = typeof DeviceMotionEvent !== 'undefined'
      this.sensors.motion = {
        available: hasMotion,
        supported: hasMotion,
        x: null, y: null, z: null, gravity: null,
        _listener: null,
      }

      if (hasMotion) {
        // Request permission on iOS
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
          try {
            const perm = await DeviceMotionEvent.requestPermission()
            if (perm === 'granted') {
              this.sensors.motion.granted = true
              this.sensors.motion.available = true
              this.bindMotion(this.sensors.motion)
            } else {
              this.sensors.motion.granted = false
              this.sensors.motion.available = false
              this.errors.push('Motion permission denied')
            }
          } catch (e) {
            this.errors.push(`Motion permission error: ${e.message}`)
          }
        } else {
          this.sensors.motion.granted = true
          this.sensors.motion.available = true
          this.bindMotion(this.sensors.motion)
        }
      }

      // Device Orientation
      const hasOrientation = typeof DeviceOrientationEvent !== 'undefined'
      this.sensors.orientation = {
        available: hasOrientation,
        supported: hasOrientation,
        alpha: null, beta: null, gamma: null,
        _listener: null,
      }

      if (hasOrientation) {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
          try {
            const perm = await DeviceOrientationEvent.requestPermission()
            if (perm === 'granted') {
              this.sensors.orientation.granted = true
              this.sensors.orientation.available = true
              this.bindOrientation(this.sensors.orientation)
            } else {
              this.sensors.orientation.granted = false
              this.sensors.orientation.available = false
              this.errors.push('Orientation permission denied')
            }
          } catch (e) {
            this.errors.push(`Orientation permission error: ${e.message}`)
          }
        } else {
          this.sensors.orientation.granted = true
          this.sensors.orientation.available = true
          this.bindOrientation(this.sensors.orientation)
        }
      }

      // Absolute orientation permission check
      if (hasOrientation && typeof DeviceOrientationEvent.requestPermission === 'function') {
        this.warnings.push('Orientation: permission required on iOS')
      }

      // Gyroscope (uses DeviceOrientationEvent)
      this.sensors.gyroscope = {
        available: hasOrientation && !!this.sensors.orientation._listener,
        supported: hasOrientation,
        alpha: null, beta: null, gamma: null,
      }

      // Accelerometer (uses DeviceMotionEvent)
      this.sensors.accelerometer = {
        available: hasMotion && !!this.sensors.motion._listener,
        supported: hasMotion,
        x: null, y: null, z: null,
      }

      // Copy live motion values to accelerometer
      if (this.sensors.motion._listener) {
        const acc = this.sensors.accelerometer
        const motion = this.sensors.motion
        this.sensors.motion._listener = (e) => {
          const a = e.acceleration || e.accelerationIncludingGravity
          if (a && typeof a.x === 'number') {
            motion.x = a.x
            motion.y = a.y
            motion.z = a.z
            acc.x = a.x
            acc.y = a.y
            acc.z = a.z
          }
        }
        window.addEventListener('devicemotion', this.sensors.motion._listener, { passive: true })
      }

      // Copy live orientation values to gyroscope
      if (this.sensors.orientation._listener) {
        const gyro = this.sensors.gyroscope
        const orient = this.sensors.orientation
        this.sensors.orientation._listener = (e) => {
          if (typeof e.alpha === 'number') gyro.alpha = e.alpha
          if (typeof e.beta === 'number') gyro.beta = e.beta
          if (typeof e.gamma === 'number') gyro.gamma = e.gamma
          orient.alpha = e.alpha
          orient.beta = e.beta
          orient.gamma = e.gamma
        }
        window.addEventListener('deviceorientation', this.sensors.orientation._listener, { passive: true })
      }

      // Check if no sensors detected on non-desktop
      const onDesktop = /Mac|Windows|Linux/.test(this.platform)
      if (!onDesktop && !this.sensors.motion.available && !this.sensors.orientation.available) {
        this.warnings.push('No sensor data received — may need permission grant')
      }
    },

    bindMotion(sensor) {
      sensor._listener = (e) => {
        const a = e.acceleration || e.accelerationIncludingGravity
        if (a && typeof a.x === 'number') {
          sensor.x = a.x
          sensor.y = a.y
          sensor.z = a.z
        }
      }
      window.addEventListener('devicemotion', sensor._listener, { passive: true })
    },

    bindOrientation(sensor) {
      sensor._listener = (e) => {
        if (typeof e.alpha === 'number') sensor.alpha = e.alpha
        if (typeof e.beta === 'number') sensor.beta = e.beta
        if (typeof e.gamma === 'number') sensor.gamma = e.gamma
      }
      window.addEventListener('deviceorientation', sensor._listener, { passive: true })
    },

    reqValue(val, unit = '') {
      if (val === null || val === undefined || !Number.isFinite(val)) return '—'
      return `${Number(val).toFixed(2)}${unit}`
    },
  },
}
