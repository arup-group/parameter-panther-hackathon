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
      sort-by="family"
      item-key="id"
      :items-per-page="limit"
      :search="search"
      hide-default-footer
      class="elevation-1 my-4"
      show-select
    >
      <template v-for="(col, i) in filters" v-slot:[`header.${i}`]="{ header }">
        <div :key="i" style="display: inline-block; padding: 16px 0">
          {{ header.text }}
        </div>
        <div :key="i" style="float: right; margin-top: 8px">
          <v-menu
            :close-on-content-click="false"
            :nudge-width="200"
            offset-y
            transition="slide-y-transition"
            left
            fixed
            style="position: absolute; right: 0"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-btn color="indigo" icon v-bind="attrs" v-on="on">
                <v-icon
                  small
                  :color="
                    activeFilters[header.value] &&
                    activeFilters[header.value].length <
                      filters[header.value].length
                      ? 'red'
                      : 'default'
                  "
                >
                  mdi-filter-variant
                </v-icon>
              </v-btn>
            </template>
            <v-list flat dense class="pa-0">
              <v-list-item-group
                multiple
                v-model="activeFilters[header.value]"
                class="py-2"
              >
                <template>
                  <v-list-item
                    :value="item"
                    :ripple="true"
                    v-for="item in filters[header.value]"
                    :key="`${item}`"
                  >
                    <template v-slot:default="{ active, toggle }">
                      <v-list-item-action>
                        <v-checkbox
                          :input-value="active"
                          :true-value="item"
                          @click="toggle"
                          color="primary"
                          :ripple="true"
                          dense
                        ></v-checkbox>
                      </v-list-item-action>
                      <v-list-item-content>
                        <v-list-item-title v-text="item"></v-list-item-title>
                      </v-list-item-content>
                    </template>
                  </v-list-item>
                </template>
              </v-list-item-group>
              <v-divider></v-divider>
              <v-row no-gutters>
                <v-col cols="6">
                  <v-btn
                    text
                    block
                    @click="toggleAll(header.value)"
                    color="success"
                    >Toggle all</v-btn
                  >
                </v-col>
                <v-col cols="6">
                  <v-btn
                    text
                    block
                    @click="clearAll(header.value)"
                    color="warning"
                    >Clear all</v-btn
                  >
                </v-col>
              </v-row>
            </v-list>
          </v-menu>
        </div>
      </template>
    </v-data-table>

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
      // headers: [],
      uniqueHeaderNames: [],
      limit: 10,
      fetchLoading: false,
      prevLoading: false,
      nextLoading: false,
      search: "",
      dialog: false,
      // filters: { 'type': [], 'family': [], 'elementId': [] },
      activeFilters: {},
    };
  },
  watch: {
    limit() {
      // If the limit is changed, we need to reset the query
      if (this.selectedCategory) this.fetchCategories();
    },
  },
  computed: {
    filters() {
      let tmp = {
        type: [],
        family: [],
        elementId: [],
      };
      // this.uniqueHeaderNames.forEach((val) => tmp.push({
      //   val: [],
      // }));
      return tmp;
    },
    headers() {
      let tmp = [
        {
          text: "Type",
          align: "start",
          sortable: true,
          value: "type",
          filter: (value) => {
            return this.activeFilters.type
              ? this.activeFilters.type.includes(value)
              : true;
          },
        },
        {
          text: "Family",
          align: "start",
          sortable: true,
          value: "family",
          filter: (value) => {
            return this.activeFilters.family
              ? this.activeFilters.family.includes(value)
              : true;
          },
        },
        {
          text: "ElementId",
          align: "start",
          sortable: true,
          value: "elementId",
          filter: (value) => {
            return this.activeFilters.elementId
              ? this.activeFilters.elementId.includes(value)
              : true;
          },
        },
      ];
      this.uniqueHeaderNames.forEach((val) =>
        tmp.push({
          text: val.replace("parameters.", "").replace(".value", ""),
          align: "start",
          sortable: true,
          value: val,
        })
      );
      return tmp;
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
      console.log("obj:", obj);

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
      this.uniqueHeaderNames = new Set();
      this.flatObjs.forEach((o) => {
        console.log(o);
        Object.keys(o).forEach(
          (k) =>
            !k.includes("__closure") &&
            !k.includes("type") &&
            !k.includes("family") &&
            !k.includes("elementId") &&
            !k.includes("category") &&
            (this.fieldsToShow.includes(k) ||
              (k.startsWith("parameters") &&
                !k.endsWith("applicationUnit") &&
                !k.endsWith("applicationUnitType") &&
                !k.endsWith("applicationId") &&
                !k.endsWith("id") &&
                !k.endsWith("totalChildrenCount") &&
                !k.endsWith("units") &&
                !k.endsWith("speckle_type") &&
                !k.endsWith("isShared") &&
                !k.endsWith("isReadOnly") &&
                !k.endsWith("isTypeParameter") &&
                !k.endsWith("applicationInternalName") &&
                !k.endsWith("name")))
              ? this.uniqueHeaderNames.add(k)
              : null //clean up this filtering!
        );
      });

      // uniqueHeaderNames.forEach((val) =>
      //   this.headers.push({
      //     text: val,
      //     value: val,
      //     sortable: true,
      //     );

      this.initFilters();

      this.totalCount = this.flatObjs.length;

      // Last, signal that we're done loading!
      this.fetchLoading = false;

      // const parameterUpdater = new ParameterUpdater(streamId);
      this.parameterUpdater.addObjects(this.flatObjs);
    },
    initFilters() {
      for (let col in this.filters) {
        this.filters[col] = this.flatObjs
          .map((d) => {
            return d[col];
          })
          .filter((value, index, self) => {
            return self.indexOf(value) === index;
          });
      }
      console.log("flatObjs:", this.flatObjs);

      // TODO restore previous activeFilters before add/remove item
      this.activeFilters = Object.assign({}, this.filters);
      console.log(this.filters);
      /*if (Object.keys(this.activeFilters).length === 0) this.activeFilters = Object.assign({}, this.filters)
      else {
        setTimeout(() => {
          console.log(this.activeFilters)
          //this.activeFilters = Object.assign({}, this.filters)
        }, 1)
      }*/
    },

    toggleAll(col) {
      console.log("toggleAll");
      this.activeFilters[col] = this.flatObjs
        .map((d) => {
          return d[col];
        })
        .filter((value, index, self) => {
          return self.indexOf(value) === index;
        });
    },

    clearAll(col) {
      console.log("clearAll");
      console.log(col);
      this.activeFilters[col] = [];
    },

    changedCategory(category) {
      this.selectedCategory = category;
    },
  },
};
</script>