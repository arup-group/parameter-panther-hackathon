<template>
  <v-container>
    <div class="mb-4">
      <v-text-field label="Object Url" v-model="url"></v-text-field>
      <v-text-field
        label="Limit"
        v-model.number="limit"
        type="number"
      ></v-text-field>
      <v-select
        :items="categories"
        label="Categories"
        @input="changedCategory"
        dense
        />
      <!-- <v-card-text class="pl-0"
        >Categories:
        <v-chip
          v-for="c in categories"
          :key="c"
          v-model="categories"
          @input="onClose(tag)"
          @click="pushSelected(c)"
          close=""
          >{{ c }}
        </v-chip>
      </v-card-text>
      <v-card-text class="pl-0"
        >Families:
        <v-chip
          v-for="f in families"
          :key="f"
          v-model="families"
          @input="onClose(c)"
          close
          >{{ f }}
        </v-chip>
      </v-card-text>
      <v-card-text class="pl-0"
        >Types:
        <v-chip
          v-for="t in types"
          :key="t"
          v-model="types"
          @input="onClose(c)"
          close
          >{{ t }}
        </v-chip>
      </v-card-text> -->

      <v-btn
        elevation="2"
        color="primary"
        :disabled="this.selectedCategory === null"
        :loading="fetchLoading && !prevLoading && !nextLoading"
        @click="fetchChildren"
        >Fetch</v-btn
      >
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
      :items="filteredFlatObjs"
      sort-by="family"
      item-key="id"
      :items-per-page="limit"
      :search="search"
      hide-default-footer
      class="elevation-1 my-4"
      show-select>
      <template v-for="(col, i) in filters" v-slot:[`header.${i}`]="{ header }">
        <div style="display: inline-block; padding: 16px 0;">{{ header.text }}</div>
        <div style="float: right; margin-top: 8px">
          <v-menu :close-on-content-click="false" :nudge-width="200" offset-y transition="slide-y-transition" left fixed style="position: absolute; right: 0">
            <template v-slot:activator="{ on, attrs }">
              <v-btn color="indigo" icon v-bind="attrs" v-on="on">
                <v-icon small 
                  :color="activeFilters[header.value] && activeFilters[header.value].length < filters[header.value].length ? 'red' : 'default'">
                  mdi-filter-variant
                </v-icon>
              </v-btn>
            </template>
            <v-list flat dense class="pa-0">
              <v-list-item-group multiple v-model="activeFilters[header.value]" class="py-2">
                <template>
                  <v-list-item :value="item" :ripple="false" v-for="(item) in filters[header.value]" :key="`${item}`">
                    <template v-slot:default="{ active, toggle }">
                      <v-list-item-action>
                        <v-checkbox :input-value="active" :true-value="item"
                          @click="toggle" color="primary" :ripple="false" dense></v-checkbox>
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
                  <v-btn text block @click="toggleAll(header.value)" color="success">Toggle all</v-btn>
                </v-col>
                <v-col cols="6">
                  <v-btn text block @click="clearAll(header.value)" color="warning">Clear all</v-btn>
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
// import { filter } from 'vue/types/umd';

export default {
  name: "DataTable",
  components: {},
  data() {
    return {
      url: "https://v2.speckle.arup.com/streams/465e7157fe/objects/2976ed34ee720713a6fe18b50c5aad71",
      totalCount: null,
      objects: ["None"],
      categories: ['Mass', 'Site', 'Doors', 'Ducts', 'Grids', 'Pipes', 'Roofs', 'Rooms', 'Views', 'Walls', 'Wires', 'Floors', 'Stairs', 'Fascias', 'Gutters', 'Windows', 'Ceilings', 'Conduits', 'Railings', 'Supports', 'Flex Ducts', 'Flex Pipes', 'Slab Edges', 'Topography', 'Cable Trays', 'Wall Sweeps', 'Duct Systems', 'Model Groups', 'Roof Soffits', 'Generic Models', 'Piping Systems', 'Curtain Systems', 'Lighting Fixtures', 'Structural Columns', 'Project Information', 'Electrical Equipment', 'Structural Beam Systems','Structural Foundations'],
      selectedCategory: null,
      families: ["None"],
      types: ["None"],
      // select:
      //   '["speckle_type","id", "elementId", "category", "family", "type", "parameters.HOST_AREA_COMPUTED.value", "parameters.HOST_VOLUME_COMPUTED.value"]',
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
      dialog: false,
      filters: { 'type': [], 'family': [], 'elementId': [] },
      activeFilters: {},
      };
  },
  watch: {
    // limit() {
    //   // If the limit is changed, we need to reset the query
    //   this.fetchChildren();
    // },
    // toggle () {
    //   this.fetchChildren();
    // },
    // toggleAll () {
    //   this.fetchChildren();
    // },
    // clearAll () {
    //   this.fetchChildren();
    // },


  },
  computed: {
    query() {
      return `[{"field":"speckle_type","operator":"!=","value":"Speckle.Core.Models.DataChunk","field":"category","operator":"!=","value":"","field":"elementId","operator":"!=","value":"","field":"category","operator":"=","value":"${this.selectedCategory}"}]`;
    }
  },
  methods: {
    async next() {
      this.nextLoading = true;
      await this.fetchChildren(false, this.cursors[this.cursors.length - 1]);
      this.nextLoading = false;
    },
    async prev() {
      this.prevLoading = true;
      await this.cursors.pop(); // remove last cursor
      await this.fetchChildren(
        false,
        this.cursors[this.cursors.length - 2],
        false
      ); // fetch using the second last cursor
      this.prevLoading = false;
    },

    async fetchChildren(
      cleanCursor = true,
      cursor = null,
      appendCursor = true
    ) {
      // Parse the object's url and extract the info we need from it.
      const url = new URL(this.url);
      const server = url.origin;
      const streamId = url.pathname.split("/")[2];
      const objectId = url.pathname.split("/")[4];

      // Get the gql query string.
      const query = this.getQuery(streamId, objectId, cursor);

      // Set loading status
      this.fetchLoading = true;

      // Send the request to the Speckle graphql endpoint.
      // Note: The limit, selection and query clause are passed in as variables.
      let rawRes = await fetch(new URL("/graphql", server), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query,
          variables: {
            limit: this.limit,
            mySelect: this.select ? JSON.parse(this.select) : null,
            myQuery: this.query ? JSON.parse(this.query) : null,
          },
        }),
      });

      // Parse the response into.
      let res = await rawRes.json();

      let obj = res.data.stream.object;

      this.totalCount = obj.children.totalCount;

      // Cursor management.
      if (cleanCursor) this.cursors = [null];
      if (appendCursor) this.cursors.push(obj.children.cursor);

      // Flatten the objects!
      this.flatObjs = obj.children.objects.map((o) =>
        flat(o.data, { safe: false })
      );
      
      const uniqueObjects = new Set();
      // const uniqueCategories = new Set();
      // const uniqueFamilies = new Set();
      // const uniqueTypes = new Set();
      this.flatObjs.forEach((o) => {
        uniqueObjects.add(o);
        // if(o.category) uniqueCategories.add(o.category);
        // if(o.family) uniqueFamilies.add(o.family);
        // if(o.type) uniqueTypes.add(o.type);
      });

      this.objects = Array.from(uniqueObjects)
      // this.categories = Array.from(uniqueCategories)
      // this.families = Array.from(uniqueFamilies)
      // this.types = Array.from(uniqueTypes)

      // Create a unique list of all the headers.
      const uniqueHeaderNames = new Set();
      this.flatObjs.forEach((o) =>
        Object.keys(o).forEach(
          (k) =>
            !k.includes("__closure") &&
            (this.fieldsToShow.includes(k) || (k.startsWith("parameters") && (!k.endsWith("applicationUnit") && !k.endsWith("applicationUnitType") && !k.endsWith("applicationId") && !k.endsWith("id") && !k.endsWith("totalChildrenCount") && !k.endsWith("units") && !k.endsWith("speckle_type") && !k.endsWith("isShared") && !k.endsWith("isReadOnly") && !k.endsWith("isTypeParameter") && !k.endsWith("applicationInternalName") && !k.endsWith("name"))))
              ? uniqueHeaderNames.add(k)
              : null //clean up this filtering!
        )
      );

      this.headers = [];
      uniqueHeaderNames.forEach((val) =>
        this.headers.push({
          text: val,
          value: val,
          sortable: true}));
          // filter: value => {
          //   return this.activeFilters.type ? this.activeFilters.type.includes(value) : true;
          // }})
      // );

      this.filteredFlatObjs = this.flatObjs;  
      this.initFilters();

      // Last, signal that we're done loading!
      this.fetchLoading = false;
    },

    getQuery(streamId, objectId, cursor = null) {
      return `
        query( $limit: Int, $mySelect: [String!], $myQuery: [JSONObject!]) {
          stream( id: "${streamId}" ) {
            object( id: "${objectId}" ) {
              children( 
                limit: $limit
                depth: 100
                select: $mySelect
                query: $myQuery
                ${cursor ? ', cursor:"' + cursor + '"' : ""}
                ) {
                cursor
                objects {
                  id
                  data
                }
              }
            }
          }
        }
      `;
    },

    initFilters() {
      for (let col in this.filters) {
        this.filters[col] = this.objects.map((d) => { return d[col] }).filter(
          (value, index, self) => { return self.indexOf(value) === index }
        )
      }
      // TODO restore previous activeFilters before add/remove item
      this.activeFilters = Object.assign({}, this.filters)
      /*if (Object.keys(this.activeFilters).length === 0) this.activeFilters = Object.assign({}, this.filters)
      else {
        setTimeout(() => {
          console.log(this.activeFilters)
          //this.activeFilters = Object.assign({}, this.filters)
        }, 1)
      }*/
    },

    filterObjects(filters) {
      this.filteredFlatObjs = this.flatObjs.filter(obj => filters.includes(obj.type))
    },

    toggle (col) {
      this.activeFilters[col] = this.objects.map((d) => { return d[col] }).filter(
        (value, index, self) => { return self.indexOf(value) === index }
      )
      this.filterObjects(this.activeFilters[col]);
    },
    
    toggleAll (col) {
      this.activeFilters[col] = this.objects.map((d) => { console.log(d[col]); return d[col] }).filter(
        (value, index, self) => { return self.indexOf(value) === index }
      )
    },
    
    clearAll (col) {
      this.activeFilters[col] = []
    },

    onClose(c) {
      this.categories = this.arrayRemove(this.categories, c)
    },

    // Using filter method to create a remove method
    arrayRemove(arr, value) {
      return arr.filter(function(foo){
        return foo != value;
      });
    },
    changedCategory(category){
      this.selectedCategory = category;
    }
  },
};
</script>