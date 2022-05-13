<template>
  <div>
    <app-bar />
    <v-container mx-0>
      <v-row no-gutters>
        <v-col md="8">
          <data-table @setRenderer="setRenderer" @applyFilter="applyFilter" />
        </v-col>
        <v-col md="4">
          <renderer :objectUrls="objectUrls" :filter="filter" />
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
      objectUrls: [],
      filter: {},
    };
  },
  methods: {
    setRenderer(url) {
      this.objectUrls = [url];
    },
    applyFilter(filter) {
      console.log("filter:", filter);
      this.filter = filter;
    },
  }
};
</script>

<style>
.container {
  max-width: 100vw;
  padding: 10px;
}
</style>