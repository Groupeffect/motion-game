<template>
  <div>
    <h3>Version {{ $version }}</h3>
  </div>
</template>
<script>
  export default {
    name: 'AboutView',
    components:{},
    mixins:[],
    props: {apiUrl: String},
    data: () => ({
    }),
    computed: {},
    methods: {},
    mounted() {},
    created() {}
  }
</script>