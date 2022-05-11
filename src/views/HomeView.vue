<template>
  <div>
    <hello-world />
    <renderer :objectUrls="objectUrls" />
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

  data() {
    return {
      objectUrls: [
        "https://speckle.xyz/streams/b13799ec6e/objects/fdd9bb528f6f09e6f3b8548791fa290e",
      ],
    };
  },
};
</script>
