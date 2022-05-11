<template>
  <v-footer>
    <v-row dense justify="center" align="center">
      <v-col cols="6">
        <v-card-actions class="justify-end">
          <v-btn
            icon
            x-large
            color="blue"
            href="https://github.com/arup-group/speckleverse-hackathon"
            target="_blank"
          >
            <v-icon>mdi-github</v-icon>
          </v-btn>
        </v-card-actions>
      </v-col>
      <v-col cols="6">
        <v-card-subtitle class="text-left pa-2">
          created by <strong>Arup</strong>
          <br />
          powered by <strong>Speckle</strong>
        </v-card-subtitle>
      </v-col>
    </v-row>
  </v-footer>
</template>

<script>
export default {
  name: "Footer",
};
</script>

