<template>
  <div id="game-over">
    <h2>?? Game Over</h2>
    <p>Dauer: <span id="survival-time">{{ survivalTime }}</span> s</p>
    <button id="restart-btn" @click="onRestartClick">Nochmal</button>
  </div>
</template>

<script>
export default {
  name: 'GameOverScreen',
  components: {},
  mixins: [],
  props: {
    survivalTime: { type: String, default: '0' }
  },
  data: () => ({}),
  computed: {},
  methods: {
    onRestartClick() {
      this.$emit('restart')
    }
  },
  mounted() {},
  created() {}
}
</script>

<style>
#game-over {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.85);
  z-index: 10;
}

#game-over h2 {
  color: #f85149;
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

#game-over p {
  color: #8b949e;
  font-size: 1.1rem;
  margin-bottom: 2rem;
}

#restart-btn {
  padding: 0.8rem 2.5rem;
  font-size: 1.1rem;
  background: #238636;
  color: #fff;
  border: none;
  border-radius: 50px;
  cursor: pointer;
}
</style>
