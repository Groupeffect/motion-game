<template>
  <div>
    <HPBarContainer :hp="hp" :hp-color-class="hpColorClass" />
    <HPText :hp="hp" />
  </div>
</template>

<script>
import HPBarContainer from './HPBarContainer.vue'
import HPText from './HPText.vue'

export default {
  name: 'GameHUD',
  components: { HPBarContainer, HPText },
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
</style>
