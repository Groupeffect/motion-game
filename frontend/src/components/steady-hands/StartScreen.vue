<template>
  <div id="start-screen">
    <h1>?? Steady Hands</h1>
    <p>Halte dein Handy so ruhig wie möglich!<br>
       Neigung & Erschatterung kosten Leben.<br>
       Leben regeneriert sich langsam.<br>
       Wer halt am langsten?</p>
    <button id="start-btn" @click="onStartClick">▶ Start</button>
  </div>
</template>

<script>
export default {
  name: 'StartScreen',
  components: {},
  mixins: [],
  props: {
    onStart: { type: Function, required: true }
  },
  data: () => ({}),
  computed: {},
  methods: {
    onStartClick() {
      this.onStart()
    }
  },
  mounted() {},
  created() {}
}
</script>

<style>
#start-screen {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #0d1117;
  z-index: 10;
}

#start-screen h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

#start-screen p {
  color: #8b949e;
  margin-bottom: 2rem;
  text-align: center;
  padding: 0 1.5rem;
  line-height: 1.6;
}

#start-btn {
  padding: 1rem 3rem;
  font-size: 1.3rem;
  background: #238636;
  color: #fff;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: transform 0.2s;
}

#start-btn:active {
  transform: scale(0.95);
}
</style>
