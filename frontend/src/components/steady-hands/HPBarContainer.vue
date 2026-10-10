<template>
  <div id="hp-bar-container">
    <HPBarFill :hp="hp" :hp-color-class="hpColorClass" />
  </div>
</template>

<script>
import HPBarFill from './HPBarFill.vue'

export default {
  name: 'HPBarContainer',
  components: { HPBarFill },
  mixins: [],
  props: {
    hp: { type: Number, default: 100 },
    hpColorClass: { type: String, default: 'green' }
  },
  data: () => ({}),
  computed: {},
  methods: {},
  mounted() {},
  created() {}
}
</script>

<style>
#hp-bar-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  max-width: 300px;
  height: 24px;
  background: #21262d;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid #30363d;
}
</style>
