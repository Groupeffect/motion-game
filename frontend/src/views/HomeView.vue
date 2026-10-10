<template>
  <div class="home">
    <h2>Sensor & Device Info</h2>

    <!-- Loading -->
    <div v-if="!sensors" class="loading">Detecting sensors…</div>

    <!-- Sensors -->
    <div v-if="sensors" class="section">
      <h3>Sensors</h3>
      <div class="grid">
        <div v-if="sensors.motion" class="card">
          <span class="label">Accelerometer</span>
          <div class="values">
            <span>X: {{ reqValue(sensors.motion.x, ' m/s²') }}</span>
            <span>Y: {{ reqValue(sensors.motion.y, ' m/s²') }}</span>
            <span>Z: {{ reqValue(sensors.motion.z, ' m/s²') }}</span>
          </div>
          <span class="status" :class="sensors.motion.available ? 'ok' : 'warn'">
            {{ sensors.motion.available ? '● Active' : sensors.motion.granted === false ? '✕ Denied' : '○ Ready' }}
          </span>
        </div>
        <div v-if="sensors.orientation" class="card">
          <span class="label">Orientation</span>
          <div class="values">
            <span>α: {{ reqValue(sensors.orientation.alpha, '°') }}</span>
            <span>β: {{ reqValue(sensors.orientation.beta, '°') }}</span>
            <span>γ: {{ reqValue(sensors.orientation.gamma, '°') }}</span>
          </div>
          <span class="status" :class="sensors.orientation.available ? 'ok' : 'warn'">
            {{ sensors.orientation.available ? '● Active' : sensors.orientation.granted === false ? '✕ Denied' : '○ Ready' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Device -->
    <div v-if="platform && platform !== 'unknown'" class="section">
      <h3>Device</h3>
      <div class="grid">
        <div class="card"><span class="label">Platform</span> {{ platform }}</div>
        <div class="card"><span class="label">Environment</span> {{ isPWA ? 'PWA' : 'Browser' }}{{ isHTTPS ? ' (HTTPS)' : ' (HTTP)' }}</div>
        <div class="card"><span class="label">Secure</span> {{ isSecureContext ? '✓' : '✕' }}</div>
      </div>
    </div>

    <!-- Permissions -->
    <div v-if="sensors && Object.keys(permissions).length" class="section">
      <h3>Permissions</h3>
      <div class="grid">
        <div v-for="(state, key) in permissions" :key="key" class="card">
          <span class="label">{{ key }}</span>
          <span class="status" :class="'perm-' + (state === 'granted' ? 'ok' : state === 'denied' ? 'err' : 'warn')">{{ state }}</span>
        </div>
      </div>
    </div>

    <!-- Errors & Warnings -->
    <div v-if="sensors && (errors.length || warnings.length)" class="section">
      <h3>Issues</h3>
      <div v-if="errors.length" class="alert error">
        <span v-for="(e, i) in errors" :key="'e'+i">⚠ {{ e }}</span>
      </div>
      <div v-if="warnings.length" class="alert warn">
        <span v-for="(w, i) in warnings" :key="'w'+i">ℹ {{ w }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import deviceSensor from '../mixins/deviceSensor'

export default {
  name: 'HomeView',
  mixins: [deviceSensor],
  methods: { reqValue: function(v, u) { return v == null || !Number.isFinite(v) ? '—' : Number(v).toFixed(2) + (u || '') } },
}
</script>

<style scoped>
.home {
  max-width: 640px;
  margin: 0 auto;
  padding: 16px;
  text-align: left;
  color: #e6edf3;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

h2 { text-align: center; color: #58a6ff; margin-bottom: 12px; font-size: 1.3rem; }
h3 { margin: 12px 0 6px; font-size: 0.95rem; color: #8b949e; text-transform: uppercase; letter-spacing: 0.05em; }

.section { margin-bottom: 12px; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
}

.card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card .label { font-size: 0.75rem; color: #8b949e; text-transform: uppercase; }
.card .values { display: flex; flex-wrap: wrap; gap: 6px; font-size: 0.85rem; color: #c9d1d9; }
.card .values span { background: #0d1117; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; }

.status { font-size: 0.75rem; margin-top: 2px; }
.status.ok { color: #3fb950; }
.status.warn { color: #d29922; }
.status.err { color: #f85149; }
.perm-ok { color: #3fb950; }
.perm-warn { color: #d29922; }
.perm-err { color: #f85149; }

.alert {
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  line-height: 1.5;
}
.alert.error { background: #3d1f28; border: 1px solid #f8514940; color: #f85149; }
.alert.warn { background: #2a2416; border: 1px solid #d2992240; color: #d29922; }
.alert span { display: block; }

.loading {
  text-align: center;
  padding: 24px;
  color: #8b949e;
  font-style: italic;
}
</style>
