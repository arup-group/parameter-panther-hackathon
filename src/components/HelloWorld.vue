<template>
  <v-container>
    <div class="mb-4">
      <v-text-field label="Object Url" v-model="url"></v-text-field>
      <v-text-field
        label="Limit"
        v-model.number="limit"
        type="number"
      ></v-text-field>
      <v-text-field label="Select" v-model="select"></v-text-field>
      <v-text-field label="Query" v-model="query"></v-text-field>

      <v-btn
        elevation="2"
        color="primary"
        :loading="fetchLoading && !prevLoading && !nextLoading"
        @click="fetchChildren"
        >Fetch</v-btn
      >
    </div>

    <p class="caption">
      Total count: {{ totalCount ? totalCount : "unknown" }}
    </p>

    <v-data-table
      :headers="headers"
      :items="flatObjs"
      :items-per-page="limit"
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

export default {
  name: "HelloWorld",
  components: {},
  data() {
    return {
      url: "https://speckle.xyz/streams/0d3cb7cb52/objects/f833afec2e17457f17e7f6429a106187",
      totalCount: null,
      query:
        '[{"field":"speckle_type","operator":"=","value":"Objects.BuiltElements.Wall:Objects.BuiltElements.Revit.RevitWall"}]',
      select:
        '["speckle_type","id","parameters.HOST_AREA_COMPUTED.value", "parameters.HOST_VOLUME_COMPUTED.value"]',
      cursors: [],
      flatObjs: [],
      headers: [],
      limit: 10,
      fetchLoading: false,
      prevLoading: false,
      nextLoading: false,
    };
  },
  watch: {
    limit() {
      // If the limit is changed, we need to reset the query
      this.fetchChildren();
    },
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

      // Create a unique list of all the headers.
      const uniqueHeaderNames = new Set();
      this.flatObjs.forEach((o) =>
        Object.keys(o).forEach((k) =>
          !k.includes("__closure") ? uniqueHeaderNames.add(k) : null
        )
      );

      this.headers = [];
      uniqueHeaderNames.forEach((val) =>
        this.headers.push({ text: val, value: val, sortable: false })
      );

      // Last, signal that we're done loading!
      this.fetchLoading = false;
    },

    getQuery(streamId, objectId, cursor = null) {
      return `
        query( $limit: Int, $mySelect: [String!], $myQuery: [JSONObject!]) {
          stream( id: "${streamId}" ) {
            object( id: "${objectId}" ) {
              data
              children( 
                limit: $limit
                depth: 100
                select: $mySelect
                query: $myQuery
                ${cursor ? ', cursor:"' + cursor + '"' : ""}
                ) {
                totalCount
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
  },
};
</script>
