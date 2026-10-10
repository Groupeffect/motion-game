<template>
  <div class="home">
    <h3>Version: {{ version }}</h3>
    <img alt="Vue logo" src="../assets/logo.png">
  </div>
</template>


<script>
  export default {
    name: 'HomeView',
    components:{},
    mixins:[],
    props: {apiUrl: String},
    data: () => ({
      version: 1
    }),
    computed: {},
    methods: {},
    mounted() {},
    created() {}
  }
</script>