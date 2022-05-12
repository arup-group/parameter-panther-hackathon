<template>
  <div>
    <v-btn @click="login('arup')">Arup</v-btn>
    <v-btn @click="login('xyz')">xyz</v-btn>
  </div>
</template>
<script>
export default {
  name: "Login",
  methods: {
    login(server) {
      this.$store.dispatch("redirectToAuth", server);
    },
  },
};
</script>
