<template>
  <div>
    <hello-world />
    <renderer />
  </div>
</template>

<script>
import HelloWorld from "../components/HelloWorld";
import Renderer from "../components/Renderer.vue";

export default {
  name: "HomeView",

  components: {
    HelloWorld,
    Renderer,
  },
};
</script>
