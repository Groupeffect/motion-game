<template>
  <div id="feedback" :style="{ boxShadow: boxShadowStyle }"></div>
</template>

<script>
export default {
  name: 'FeedbackOverlay',
  components: {},
  mixins: [],
  props: {
    intensity: { type: Number, default: 0 }
  },
  data: () => ({}),
  computed: {
    boxShadowStyle() {
      const a = Math.min(0.4, this.intensity * 0.05)
      const p = this.intensity * 10
      return a > 0.01 ? `inset 0 0 ${p}px rgba(248, 81, 73, ${a})` : 'none'
    }
  },
  methods: {},
  mounted() {},
  created() {}
}
</script>

<style>
#feedback {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  transition: box-shadow 0.1s;
}
</style>
