<template>
  <v-container>
    <div class="mb-4">
      <v-btn @click="paramUpdateTest">TEST</v-btn>
      <div>
        <v-row no-gutters>
          <v-col md="11">
            <v-text-field label="Object Url" v-model="url"></v-text-field>
          </v-col>
          <v-col md="1" class="pl-4">
            <v-text-field
              label="Limit"
              v-model.number="limit"
              type="number"
            ></v-text-field>
          </v-col>
        </v-row>
      </div>
      <v-btn
        class="mb-6"
        elevation="2"
        color="primary"
        :loading="fetchLoading && !prevLoading && !nextLoading"
        @click="fetchCategories"
        >Fetch
      </v-btn>
      <v-autocomplete
        v-model="selectedCategory"
        :items="categories"
        label="Categories"
        @input="fetchCategoryObjects"
        dense
      />
    </div>

    <p class="caption">
      Total count: {{ totalCount ? totalCount : "unknown" }}
    </p>

    <v-card-title>
      Search:
      <v-spacer></v-spacer>
      <v-text-field
        v-model="search"
        append-icon="mdi-magnify"
        label=""
        single-line
        hide-details
      ></v-text-field>
    </v-card-title>

    <v-data-table
      dense
      :headers="headers"
      :items="flatObjs"
      :items-per-page="limit"
      :search="search"
      hide-default-footer
      class="elevation-1 my-4"
    ></v-data-table>

    <v-btn
      @click="prev"
      :loading="prevLoading"
      :disabled="cursors.length <= 2"
      class="mr-2"
      >prev</v-btn
    >
    <v-btn
      @click="next"
      :loading="nextLoading"
      :disabled="
        cursors.length === 0 || (cursors.length - 1) * limit >= totalCount
      "
      class="mr-2"
      >next</v-btn
    >

    <p class="caption mt-2">
      Curr items: {{ (cursors.length - 1) * limit }} Cursor:
      {{ cursors ? cursors : "n/a" }}
    </p>
  </v-container>
</template>

<script>
import flat from "flat";
import { objectQuery } from "@/queries";

import { ParameterUpdater } from "@/utils/ParameterUpdater";

export default {
  name: "DataTable",
  components: {},
  data() {
    return {
      url: "https://v2.speckle.arup.com/streams/465e7157fe/objects/2976ed34ee720713a6fe18b50c5aad71",
      totalCount: null,
      parameterUpdater: new ParameterUpdater(""),
      categories: [],
      objects: [],
      selectedCategory: null,
      // select:
      //   '["speckle_type","id", "elementId", "category", "family", "type", "parameters.HOST_AREA_COMPUTED.value", "parameters.HOST_VOLUME_COMPUTED.value"]',
      query:
        '[{"field":"speckle_type","operator":"!=","value":"Speckle.Core.Models.DataChunk","field":"category","operator":"!=","value":"","field":"elementId","operator":"!=","value":""}]',
      cursors: [],
      fieldsToShow: [
        "speckle_type",
        "id",
        "elementId",
        "category",
        "family",
        "type",
      ],
      flatObjs: [],
      filteredFlatObjs: [],
      headers: [],
      limit: 10,
      fetchLoading: false,
      prevLoading: false,
      nextLoading: false,
      search: "",
    };
  },
  watch: {
    limit() {
      // If the limit is changed, we need to reset the query
      if (this.selectedCategory) this.fetchCategories();
    },
  },
  methods: {
    async next() {
      this.nextLoading = true;
      await this.fetchCategories(false, this.cursors[this.cursors.length - 1]);
      this.nextLoading = false;
    },
    async prev() {
      this.prevLoading = true;
      await this.cursors.pop(); // remove last cursor
      await this.fetchCategories(
        false,
        this.cursors[this.cursors.length - 2],
        false
      ); // fetch using the second last cursor
      this.prevLoading = false;
    },
    paramUpdateTest() {
      this.parameterUpdater.updateParam(
        "001e4a317dff1b69fbaff7ed0a63fde5",
        "cfef2a72708bd4ba727715d8c14991d0",
        "THIS IS A NEW VALUE"
      );
      console.log(this.parameterUpdater);
    },
    async fetchFromApi(query, variables, server) {
      return await fetch(new URL("/graphql", server), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query,
          variables: variables,
        }),
      });
    },
    async fetchCategories() {
      // Parse the object's url and extract the info we need from it.
      const url = new URL(this.url);
      const server = url.origin;
      const streamId = url.pathname.split("/")[2];
      const objectId = url.pathname.split("/")[4];

      // Get the gql query string.
      const query = objectQuery(streamId, objectId);

      // Set loading status
      this.fetchLoading = true;

      // Send the request to the Speckle graphql endpoint.
      // Note: The limit, selection and query clause are passed in as variables.
      let rawRes = await this.fetchFromApi(query, null, server);

      // Parse the response into.
      let res = await rawRes.json();

      let obj = res.data.stream.object;

      this.objects = obj.data;
      let tempCategories = Object.keys(this.objects).filter((cat) =>
        cat.startsWith("@")
      );
      this.categories = tempCategories
        .map((cat) => cat.slice(1))
        .filter((c) => !c.startsWith("<"))
        .sort();

      // Last, signal that we're done loading!
      this.fetchLoading = false;
    },
    async fetchCategoryObjects(category) {
      // Set loading status
      this.fetchLoading = true;

      this.flatObjs = [];
      this.selectedCategory = category;

      let objs = this.objects[`@${category}`];
      let referencedIds = objs.map((o) => o["referencedId"]);

      const url = new URL(this.url);
      const server = url.origin;
      const streamId = url.pathname.split("/")[2];
      this.parameterUpdater.streamid = streamId;

      for (const objectId of referencedIds) {
        let query = objectQuery(streamId, objectId);

        let variables = {
          limit: this.limit,
          mySelect: this.select ? JSON.parse(this.select) : null,
          myQuery: this.query ? JSON.parse(this.query) : null,
        };

        let rawRes = await this.fetchFromApi(query, variables, server);

        // Parse the response into.
        let res = await rawRes.json();

        let obj = res.data.stream.object;

        // Flatten the object!
        let flatObj = flat(obj.data, { safe: false });
        this.flatObjs.push(flatObj);
      }

      // Create a unique list of all the headers.
      const uniqueHeaderNames = new Set();
      this.flatObjs.forEach((o) => {
        console.log(o);
        Object.keys(o).forEach(
          (k) =>
            !k.includes("__closure") &&
            (this.fieldsToShow.includes(k) || k.startsWith("parameter"))
              ? uniqueHeaderNames.add(k)
              : null //clean up this filtering!
        );
      });

      this.headers = [];
      uniqueHeaderNames.forEach((val) =>
        this.headers.push({ text: val, value: val, sortable: true })
      );

      this.totalCount = this.flatObjs.length;

      // Last, signal that we're done loading!
      this.fetchLoading = false;

      // const parameterUpdater = new ParameterUpdater(streamId);
      this.parameterUpdater.addObjects(this.flatObjs);
    },
  },
};
</script>