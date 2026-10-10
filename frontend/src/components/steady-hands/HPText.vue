<template>
  <div id="hp-text">{{ displayText }}</div>
</template>

<script>
export default {
  name: 'HPText',
  components: {},
  mixins: [],
  props: {
    hp: { type: Number, default: 100 }
  },
  data: () => ({}),
  computed: {
    displayText() {
      return Math.ceil(this.hp) + ' / 100'
    }
  },
  methods: {},
  mounted() {},
  created() {}
}
</script>

<style>
#hp-text {
  position: fixed;
  top: 48px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.9rem;
  color: #8b949e;
}
</style>
