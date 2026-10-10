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
      />
    </template>
  </div>
</template>

<script>
import { useRepo } from 'pinia-orm'
import GameData from '@/models/GameData.js'
import gameMotion from '@/mixins/gameMotion.js'
import gameAudio from '@/mixins/gameAudio.js'
import StartScreen from './StartScreen.vue'
import GameHUD from './GameHUD.vue'
import CountdownOverlay from './CountdownOverlay.vue'
import FeedbackOverlay from './FeedbackOverlay.vue'
import GameOverScreen from './GameOverScreen.vue'

export default {
  name: 'SteadyHandsGame',
  components: {
    StartScreen, GameHUD, CountdownOverlay, FeedbackOverlay, GameOverScreen
  },
  mixins: [gameMotion, gameAudio],
  data: () => ({
    screen: 'start',
    countdownValue: '',
    countdownTimer: null,
    warningTimer: null
  }),
  computed: {
    game() {
      return useRepo(GameData).find('session') || {}
    },
    hp() {
      return this.game.hp || 0
    },
    running() {
      return this.game.running || false
    },
    survivalTime() {
      return this.game.survivalTime || '0'
    },
    hpColorClass() {
      return this.game.hpColorClass || 'green'
    },
    feedbackIntensity() {
      return this.game.feedbackIntensity || 0
    }
  },
  methods: {
    async handleStart() {
      this.initAudio()
      this.installMotionListener()

      const permission = await this.requestMotionPermission()
      if (!permission.success) {
        if (permission.reason === 'denied') {
          alert('Der Zugriff auf den Bewegungssensor wurde verweigert. Bitte erlaube Bewegung & Orientierung f?r diese Website.')
        } else if (permission.reason === 'unsupported') {
          alert('Dieser Browser unterst?tzt keine Bewegungssensoren.')
        } else {
          alert('Der Bewegungssensor konnte nicht aktiviert werden.')
        }
        return
      }

      const sensorAvailable = await this.waitForSensor(5000)
      if (!sensorAvailable) {
        // Show warning after game starts (non-blocking)
      }

      this.screen = 'countdown'
      this.runCountdown()
    },

    runCountdown() {
      const sequence = ['3', '2', '1', 'GO', '']
      let i = 0

      this.countdownTimer = setInterval(() => {
        if (i < sequence.length) {
          this.countdownValue = sequence[i]
          if (sequence[i] !== 'GO') {
            this.playCountdownBeep()
          } else {
            this.playGoBeep()
          }
          i++
        } else {
          clearInterval(this.countdownTimer)
          this.countdownValue = ''
          this.startGame()
          this.screen = 'playing'
          this.setInitialBase()

          this.warningTimer = setTimeout(() => {
            if (this.screen === 'playing' && !this.gotMotionData) {
              // Show warning
            }
          }, 3000)
        }
      }, 1000)
    },

    startGame() {
      const repo = useRepo(GameData)
      let record = repo.find('session')
      if (!record) {
        record = { id: 'session' }
      }
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

      setTimeout(() => {
        this.screen = 'gameover'
        this.onGameOverScreenVisible()
      }, 3000)
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
        if (Math.random() < 0.3) {
          this.playDamageSound(deviation)
        }
      }

      record.hp += 0.033
      record.hp = Math.max(0, Math.min(100, record.hp))
      record.feedbackIntensity = deviation

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
  mounted() {
    this.installMotionListener()
  },
  created() {}
}
</script>

<style>
#steady-hands-game {
  position: fixed;
  inset: 0;
}
</style>
