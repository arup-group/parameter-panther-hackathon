<template>
  <v-container>
    <div class="mb-0">
      <div>
        <v-row no-gutters>
          <v-col md="9">
            <v-text-field label="Object Url" v-model="url"></v-text-field>
          </v-col>
          <v-col md="1" class="pl-4">
            <v-text-field
              label="Limit"
              v-model.number="limit"
              type="number"
            ></v-text-field>
          </v-col>
          <v-col md="1" class="pl-4">
            <v-btn
              elevation="2"
              color="primary"
              :loading="fetchLoading && !prevLoading && !nextLoading"
              @click="fetchCategories"
              >Fetch Categories
            </v-btn>
          </v-col>
        </v-row>
      </div>
      <v-autocomplete
        v-model="selectedCategory"
        :items="categories"
        label="Categories"
        @input="fetchCategoryObjects"
        dense
      />
    </div>
    <v-card-title class="ml-0 pl-0 pt-2">
      Revit Instance Parameters
    </v-card-title>
    <v-autocomplete
      v-model="selectedInstanceParameters"
      :items="instanceParameters"
      label="Instance parameters"
      @input="fetchInstanceParameters"
      multiple
    >
      <template slot="selection" slot-scope="data">
        <v-chip :selected="data.selected" class="chip--select">
          {{ data.item.replace("parameters.", "").replace(".value", "") }}
        </v-chip>
      </template>
      <template slot="item" slot-scope="data">
        <v-list-tile-content>
          <v-list-tile-title
            v-html="data.item.replace('parameters.', '').replace('.value', '')"
          ></v-list-tile-title>
        </v-list-tile-content>
      </template>
    </v-autocomplete>
    <v-card-title class="pl-0 pb-2">
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
      v-model="selectedItem"
    >
      <template v-for="(col, i) in filters" v-slot:[`header.${i}`]="{ header }">
        <div :key="`${i}-header`" style="display: inline-block; padding: 16px 0">
          {{ header.text }}
        </div>
        <div :key="`${i}-other`" style="float: right; margin-top: 8px">
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
      <template v-slot:top>
        <v-dialog v-model="dialog" max-width="750px">
          <v-card>
            <v-card-title>
              <span class="headline">Edit Parameters</span>
            </v-card-title>
            <v-card-text>
              <v-container>
                <template v-for="(field, i) in editableFields">
                  <!-- should specify which "headers" are editable -->
                  <v-col :key="i" cols="12">
                    <v-text-field
                      :key="i"
                      v-model="editedItem[field]"
                      :label="field"
                    ></v-text-field>
                  </v-col>
                </template>
              </v-container>
            </v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="blue darken-1" text @click="close">Cancel</v-btn>
              <v-btn color="blue darken-1" text @click="save">Save</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </template>
      <template v-slot:[`item.actions`]="{ item }">
        <v-icon small class="mr-2" @click="editItem(item)"> mdi-pencil </v-icon>
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
      Total count: {{ totalCount ? totalCount : "unknown" }}
    </p>

    <div style="width: 100%" class="d-flex justify-end">
      <v-btn
        color="primary"
        @click="commitObjects"
        :disabled="commitObjectsDisabled"
        >Save</v-btn
      >
    </div>
    <v-snackbar v-model="successSnackbar" :timeout="2000" color="green" right rounded="pill">
      Params updated
    </v-snackbar>
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
        // "speckle_type",
        // "id",
        // "elementId",
        // "category",
        // "family",
        // "type",
      ],
      flatObjs: [],
      filteredFlatObjs: [],
      editedItem: {},
      editableFields: [],
      editedIndex: -1,
      // headers: [],
      uniqueHeaderNames: [],
      instanceParameters: [],
      selectedInstanceParameters: [],
      limit: 10,
      fetchLoading: false,
      prevLoading: false,
      nextLoading: false,
      search: "",
      dialog: false,
      // filters: { 'type': [], 'family': [], 'elementId': [] },
      activeFilters: {},
      selectedItem: [],
      rendererFilter: [],
      successSnackbar: false
    };
  },
  watch: {
    limit() {
      // If the limit is changed, we need to reset the query
      if (this.selectedCategory) this.fetchCategories();
    },
    dialog(val) {
      val || this.close();
    },
    selectedItem() {
      if (this.selectedItem) {
        let obj = this.selectedItem[0];

        let filteredFields = Object.keys(obj)
          .filter(
            (key) =>
              !this.fieldsToShow.includes(key) | key.startsWith("parameters")
          )
          .reduce((o, key) => {
            o[key] = obj[key];
            return o;
          }, {});

        this.editedItem = filteredFields;
        // this.editableFields = Object.keys(filteredFields);
        console.log("uniqueHeaderNames 1:", this.uniqueHeaderNames);
        this.editableFields = this.uniqueHeaderNames;
      }
    },
    activeFilters: {
      handler() {
        let ids = [];
        for (var index in this.flatObjs) {
          var o = this.flatObjs[index];
          if(!this.activeFilters["family"].includes(o["family"])) {
            continue;
          }
          else if(!this.activeFilters["type"].includes(o["type"])) {
            continue;
          }
          else if(!this.activeFilters["elementId"].includes(o["elementId"])) {
            continue;
          }
          else if(!this.activeFilters["level"].includes(o["level"])) {
            continue;
          }
          ids.push(o.id);
        }
        this.rendererFilter = {
        filterBy: { __parents: { includes: ids } },
        ghostOthers: true,
      };
      this.$emit("applyFilter", this.rendererFilter);
     },
     deep: true
    },
  },
  computed: {
    commitObjectsDisabled() {
      return this.parameterUpdater.objects.length === 0;
    },
    filters() {
      let tmp = {
        elementId: [],
        family: [],
        type: [],
        level: [],
      };
      // this.uniqueHeaderNames.forEach(() => {
      //   tmp = {
      //     ...tmp,
      //     val: []
      //   }
      // });
      return tmp;
    },
    headers() {
      let tmp = [
        {
          text: "Edit",
          align: "start",
          sortable: false,
          value: "actions",
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
        {
          text: "Level",
          align: "start",
          sortable: true,
          value: "level.name",
          // filter: (value) => {
          //   return this.activeFilters.level
          //     ? this.activeFilters.level.includes(value)
          //     : true;
          // },
        },
      ];
      this.uniqueHeaderNames.forEach((val) => {
        if (val) {
          tmp.push({
            text: val.replace("parameters.", "").replace(".value", ""),
            align: "start",
            sortable: true,
            value: val,
          });
        }
      });
      tmp.push({
        text: "Id",
        align: "start",
        sortable: true,
        value: "id",
      });
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
    async commitObjects() {
      await this.parameterUpdater.commitObjects();

      this.successSnackbar = true;
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
      this.$emit("setRenderer", this.url);

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
        // console.log("obj.data:", obj.data);
        // filter RevitElementTypes
        if(!obj.data["speckle_type"].endsWith("RevitElementType")) {
          this.parameterUpdater.addObjects([obj]);

          // Flatten the object!
          let flatObj = flat(obj.data, { safe: false });
          this.flatObjs.push(flatObj);
        }
      }

      // Create a unique list of all the headers.
      this.uniqueHeaderNames = new Set();

      // console.log("flatObjs:", this.flatObjs);

      let ids = [];

      for(var index in this.flatObjs) {
        var o = this.flatObjs[index];

        Object.keys(o).forEach(
          (k) => {
            if(
            !k.includes("__closure") &&
            !k.includes("type") &&
            !k.includes("id") &&
            !k.includes("family") &&
            !k.includes("elementId") &&
            !k.includes("category") &&
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
            !k.endsWith("name"))) {
              let isReadOnlyKey = k.replace("value", "isReadOnly");
              let isTypeParameterKey = k.replace("value", "isTypeParameter");
              let nameKey = k.replace("value", "name");
              let applicationInternalNameKey = k.replace("value", "applicationInternalName");

              let isReadOnly = o[isReadOnlyKey];
              let isTypeParameter = o[isTypeParameterKey];
              let name = o[nameKey];
              let applicationInternalName = o[applicationInternalNameKey];
              let units = o["units"];
        
              if(!isReadOnly && !isTypeParameter) {
                // console.log("isReadOnly:", isReadOnly);
                // console.log("isTypeParameter:", isTypeParameter);
                // this.uniqueHeaderNames.add(k);
                // console.log("kept:", k);

                let instanceParameterName = name + " | " + applicationInternalName;
                if(units) {
                  instanceParameterName = instanceParameterName + " [" + units + "]";
                }
                  this.instanceParameters.push(instanceParameterName);
              }
              else {
                // console.log("dropped:", k);
              }
            }
          }
        );
        ids.push(o.id);
      }
      this.initFilters();
      this.totalCount = this.flatObjs.length;

      this.rendererFilter = {
        filterBy: { __parents: { includes: ids } },
        ghostOthers: true,
      };
      this.$emit("applyFilter", this.rendererFilter);

      // Last, signal that we're done loading!
      this.fetchLoading = false;
    },
    fetchInstanceParameters() {
      let filteredHeaders = this.instanceParameters
        .filter((header) => this.selectedInstanceParameters.includes(header))
        .sort();
      let headerName = filteredHeaders.map(header => header.split("|")[0]);
      this.uniqueHeaderNames = new Set(headerName);
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
      // console.log("flatObjs:", this.flatObjs);

      // TODO restore previous activeFilters before add/remove item
      this.activeFilters = Object.assign({}, this.filters);
      // console.log(this.filters);
      /*if (Object.keys(this.activeFilters).length === 0) this.activeFilters = Object.assign({}, this.filters)
      else {
        setTimeout(() => {
          console.log(this.activeFilters)
          //this.activeFilters = Object.assign({}, this.filters)
        }, 1)
      }*/
    },
    getIds() {
      let ids = [];
      for (var index in this.flatObjs) {
        var o = this.flatObjs[index];
        ids.push(o.id);
      }
      return ids;
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
      this.rendererFilter = {
        filterBy: { __parents: { includes: this.getIds() } },
        ghostOthers: true,
      };
      this.$emit("applyFilter", this.rendererFilter);
    },
    clearAll(col) {
      console.log("clearAll");
      // console.log(col);
      this.activeFilters[col] = [];
      this.rendererFilter = {
        filterBy: { __parents: { includes: [] } },
        ghostOthers: true,
      };
      this.$emit("applyFilter", this.rendererFilter);
    },
    editItem(item) {
      // console.log("editItem()");
      let matchingItem = this.flatObjs.filter((obj) => {
        return obj.id === item.id;
      });
      // this is not working!
      this.editedIndex = this.flatObjs.indexOf(matchingItem);
      this.editedItem = Object.assign({}, item);
      console.log("editedItem 2:", this.editedItem)
      // console.log("editedIndex:", this.editedIndex);

      // HERE
      console.log("uniqueHeaderNames 2:", this.uniqueHeaderNames);
      this.editableFields = this.uniqueHeaderNames;
      this.dialog = true;
    },
    deleteItem(item) {
      console.log(item);
      const index = this.flatObjs.indexOf(item);
      confirm("Are you sure you want to delete this item?") &&
        this.flatObjs.splice(index, 1);
    },
    close() {
      this.dialog = false;
      this.$nextTick(() => {
        this.editedItem = Object.assign({}, this.defaultItem);
        this.editedIndex = -1;
      });
    },
    save() {
      for(var index in this.flatObjs) {
        var obj = this.flatObjs[index];
        if (obj.id === this.editedItem.id) {
          this.editedIndex = index;
        }
      }
      const paramIdValArr = {};
      const updatedParams = Object.entries(this.editedItem).filter(([key]) => !key.includes(".") && key.includes(" ")).map(([key, val]) => [key.trim(), val]);
      Object.entries(this.editedItem).forEach(([key, val]) => {
        if (key.endsWith(".name") && val) {
          let id, value;
          updatedParams.forEach(([ukey, uval]) => {
            if (ukey === val) {
              id = this.editedItem[key.replace(".name", ".id")]
              value = uval;
              paramIdValArr[key.replace("parameters.", "").replace(".name", "")] = [id, value];
            }
          })
        }
      });

      Object.entries(paramIdValArr).forEach(([key, val]) => {
        key;
        this.parameterUpdater.updateParam(this.editedItem.id, val[0], val[1]);
      });
      console.log("parameterUpdater:", this.parameterUpdater);
      if (this.editedIndex > -1) {
        Object.assign(this.flatObjs[this.editedIndex], this.editedItem);
      } else {
        this.flatObjs.push(this.editedItem);
      }
      this.close();
    },
  },
};
</script>
