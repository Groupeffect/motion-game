<template>
  <div class="hp-fill" :style="{ width: barWidth }" :class="gradientClass"></div>
</template>

<script>
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
    barWidth() {
      return this.hp + '%'
    },
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
</script>

<style>
.hp-fill {
  height: 100%;
  border-radius: 10px;
  transition: width 0.1s linear;
}

.hp-green {
  background: linear-gradient(90deg, #238636, #2ea043);
}

.hp-orange {
  background: linear-gradient(90deg, #d29922, #f0883e);
}

.hp-red {
  background: linear-gradient(90deg, #f85149, #da3633);
}
</style>
