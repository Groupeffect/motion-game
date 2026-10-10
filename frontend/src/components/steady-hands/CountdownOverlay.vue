<template>
  <div id="countdown" v-if="visible">
    <span>{{ value }}</span>
  </div>
</template>

<script>
export default {
  name: 'CountdownOverlay',
  components: {},
  mixins: [],
  props: {
    visible: { type: Boolean, default: false },
    value: { type: String, default: '' }
  },
  data: () => ({}),
  computed: {},
  methods: {},
  mounted() {},
  created() {}
}
</script>

<style>
#countdown {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(13, 17, 23, 0.9);
  z-index: 5;
  font-size: 5rem;
  font-weight: bold;
}
</style>
