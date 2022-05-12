<template>
  <div>
    <app-bar />
    <v-container mx-0>
      <v-row no-gutters>
        <v-col md="8">
          <data-table />
        </v-col>
        <v-col md="4">
          <renderer :objectUrls="objectUrls" />
        </v-col>
      </v-row>
    </v-container>
    <Footer />
  </div>
</template>

<script>
import DataTable from "../components/DataTable";
import AppBar from "../components/AppBar.vue";
import Renderer from "../components/Renderer.vue";
import Footer from "../components/Footer.vue";

export default {
  name: "HomeView",

  components: {
    AppBar,
    DataTable,
    Renderer,
    Footer,
  },

  data() {
    return {
      objectUrls: [
        "https://v2.speckle.arup.com/streams/465e7157fe/objects/2976ed34ee720713a6fe18b50c5aad71",
      ],
    };
  },
};
</script>

<style>
.container {
  max-width: 100vw;
  padding: 10px;
}
</style>