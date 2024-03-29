<template>
  <div>
    <div
      ref="rendererparent"
      id="rendererparent"
      style="height: 700px; width: 100%"
    >
      <div
        :style="`
          height: 100vh;
          width: 100%;
          ${!$vuetify.breakpoint.smAndDown ? 'top: -64px;' : 'top: -56px;'}
          left: 22px;
          position: absolute;
          z-index: 10;
          pointer-events: none;`"
      >
        <object-selection
          v-show="selectionData.length !== 0"
          :key="'one'"
          :objects="selectionData"
          :stream-id="$route.params.streamId"
          @clear-selection="selectionData = []"
        />
      </div>
      <v-fade-transition>
        <div v-show="!hasLoadedModel" class="overlay cover-all">
          <transition name="fade">
            <div v-show="hasImg" ref="cover" class="overlay-abs bg-img"></div>
          </transition>
          <div class="overlay-abs radial-bg"></div>
          <div class="overlay-abs" style="pointer-events: none">
            <v-btn
              color="primary"
              class="vertical-center"
              style="pointer-events: all"
              small
              @click="load()"
            >
              <v-icon>mdi-play</v-icon>
            </v-btn>
          </div>
        </div>
      </v-fade-transition>
      <v-progress-linear
        v-if="hasLoadedModel && loadProgress < 99"
        v-model="loadProgress"
        height="4"
        rounded
        class="vertical-center elevation-10"
        style="position: absolute; width: 80%; left: 10%; opacity: 0.5"
      ></v-progress-linear>

      <v-card
        v-show="hasLoadedModel && loadProgress >= 99"
        style="position: absolute; bottom: 0px; z-index: 2; width: 100%"
        class="pa-0 text-center transparent elevation-0 pb-3"
      >
        <v-btn-toggle class="elevation-0" style="z-index: 100">
          <v-btn
            v-if="
              selectedObjects.length !== 0 &&
              (showSelectionHelper || fullScreen)
            "
            small
            color="primary"
            @click="showObjectDetails = !showObjectDetails"
          >
            <span v-if="!isSmall">Selection Details</span>
            <v-icon v-else small>mdi-cube</v-icon>
            ({{ selectedObjects.length }})
          </v-btn>
          <v-menu top close-on-click offset-y style="z-index: 100">
            <template #activator="{ on: onMenu, attrs: menuAttrs }">
              <v-tooltip top>
                <template #activator="{ on: onTooltip, attrs: tooltipAttrs }">
                  <v-btn
                    small
                    v-bind="{ ...tooltipAttrs, ...menuAttrs }"
                    v-on="{ ...onTooltip, ...onMenu }"
                  >
                    <v-icon small>mdi-camera</v-icon>
                  </v-btn>
                </template>
                Select view
              </v-tooltip>
            </template>

            <v-list dense>
              <v-list-item @click="setView('top')">
                <v-list-item-title>Top</v-list-item-title>
              </v-list-item>
              <v-list-item @click="setView('front')">
                <v-list-item-title>Front</v-list-item-title>
              </v-list-item>
              <v-list-item @click="setView('back')">
                <v-list-item-title>Back</v-list-item-title>
              </v-list-item>
              <v-list-item @click="setView('left')">
                <v-list-item-title>Left</v-list-item-title>
              </v-list-item>
              <v-list-item @click="setView('right')">
                <v-list-item-title>Right</v-list-item-title>
              </v-list-item>
              <v-divider v-if="namedViews.length !== 0"></v-divider>
              <v-list-item
                v-for="view in namedViews"
                :key="view.id"
                @click="setNamedView(view.id)"
              >
                <v-list-item-title>{{ view.name }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>

          <v-tooltip top>
            <template #activator="{ on, attrs }">
              <v-btn v-bind="attrs" small v-on="on" @click="zoomEx()">
                <v-icon small>mdi-cube-scan</v-icon>
              </v-btn>
            </template>
            Focus entire model
          </v-tooltip>
          <v-tooltip top>
            <template #activator="{ on, attrs }">
              <v-btn v-bind="attrs" small @click="sectionToggle()" v-on="on">
                <v-icon small>mdi-scissors-cutting</v-icon>
              </v-btn>
            </template>
            Show / Hide Section plane
          </v-tooltip>
          <v-tooltip top>
            <template #activator="{ on, attrs }">
              <v-btn
                v-bind="attrs"
                small
                @click="showHelp = !showHelp"
                v-on="on"
              >
                <v-icon small>mdi-help</v-icon>
              </v-btn>
            </template>
            Show viewer help
          </v-tooltip>
          <v-dialog v-model="showHelp" max-width="290">
            <v-card>
              <v-card-text class="pt-7">
                <v-icon class="mr-2">mdi-rotate-orbit</v-icon>
                Use your
                <b>left mouse button</b>
                to rotate the view.
                <br />
                <br />
                <v-icon class="mr-2">mdi-pan</v-icon>
                Use your
                <b>right mouse button</b>
                to pan the view.
                <br />
                <br />
                <v-icon class="mr-2">mdi-cursor-default-click</v-icon>
                <b>Double clicking an object</b>
                focus it in the camera view.
                <br />
                <br />
                <v-icon class="mr-2">mdi-cursor-default-click-outline</v-icon>
                <b>Double clicking on the background</b>
                will focus again the entire scene.
              </v-card-text>
            </v-card>
          </v-dialog>
        </v-btn-toggle>
      </v-card>
    </div>
    <!-- <p v-if="loaded !== 100">loading... {{ loaded }}</p> -->
  </div>
</template>

<script>
import { Viewer } from "@speckle/viewer";
import throttle from "lodash.throttle";

export default {
  name: "Renderer",
  components: {
    ObjectSelection: () => import("./viewer/ObjectSelection"),
  },
  props: {
    autoLoad: {
      type: Boolean,
      default: false,
    },
    objectUrls: {
      type: Array,
      default: null,
    },
    unloadTrigger: {
      type: Number,
      default: 0,
    },
    showSelectionHelper: {
      type: Boolean,
      default: false,
    },
    embeded: {
      type: Boolean,
      default: false,
    },
    filter: {
      type: Object,
      default: null,
    },
  },
  data() {
    return {
      hasLoadedModel: false,
      loadProgress: 0,
      fullScreen: false,
      showHelp: false,
      alertMessage: null,
      showAlert: false,
      selectedObjects: [],
      selectionData: [],
      showObjectDetails: false,
      hasImg: false,
      namedViews: [],
    };
  },
  watch: {
    unloadTrigger() {
      this.unloadData();
    },
    fullScreen() {
      setTimeout(() => window.__viewer.onWindowResize(), 20);
    },
    loadProgress(newVal) {
      if (newVal >= 99) {
        let views = window.__viewer.interactions.getViews();
        this.namedViews.push(...views);
      }
    },
    objectUrls() {
      this.unloadData();
      this.load();
    },
    filter() {
      this.applyFilter();
    },
  },
  mounted() {
    this.renderStream();
  },
  methods: {
    renderStream() {
      let renderDomElement = document.getElementById("renderer");
      if (!renderDomElement) {
        renderDomElement = document.createElement("div");
        renderDomElement.id = "renderer";
      }
      this.domElement = renderDomElement;
      this.domElement.style.display = "inline-block";
      this.$refs.rendererparent.appendChild(renderDomElement);
      if (!window.__viewer) {
        window.__viewer = new Viewer({
          container: renderDomElement,
          showStats: true,
        });
      }
      window.__viewer.onWindowResize();
      this.setupEvents();

      this.load(); // remove if not autoloading?
    },
    zoomEx() {
      window.__viewer.interactions.zoomExtents();
    },
    setView(view) {
      window.__viewer.interactions.rotateTo(view);
    },
    setNamedView(id) {
      window.__viewer.interactions.setView(id);
    },
    sectionToggle() {
      window.__viewer.toggleSectionBox();
    },
    setupEvents() {
      window.__viewer.on("load-warning", ({ message }) => {
        this.alertMessage = message;
        this.showAlert = true;
      });
      window.__viewer.on(
        "load-progress",
        throttle(
          function (args) {
            this.loadProgress = args.progress * 100;
            this.zoomEx();
          }.bind(this),
          200
        )
      );
      window.__viewer.on("select", (objects) => {
        this.$emit("selection", objects);
        this.selectedObjects.splice(0, this.selectedObjects.length);
        this.selectedObjects.push(objects);
        //this.selectionData.push(objects.userData)
      });
    },
    load() {
      if (!this.objectUrls || this.objectUrls.length === 0) return;
      this.hasLoadedModel = true;
      this.objectUrls?.forEach((url) => {
        window.__viewer.loadObject(url, this.$store.state.token.token);
        window.__viewerLastLoadedUrl = url;
      });
      this.setupEvents();
    },
    unloadData() {
      // window.__viewer.sceneManager.removeAllObjects();
      this.hasLoadedModel = false;
      this.loadProgress = 0;
      this.namedViews.splice(0, this.namedViews.length);
    },
    applyFilter() {
      // console.log("this.filter:", this.filter);
      window.__viewer.applyFilter(this.filter);
    },
  },
};
</script>
<style>
.top-left {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 3;
}
.top-right {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 3;
}
#rendererparent {
  position: relative;
  display: inline-block;
  width: 100%;
  height: 100%;
}
.fullscreen {
  position: fixed !important;
  top: 0;
  left: 0;
  z-index: 10;
  /*background-color: rgb(58, 59, 60);*/
  background-color: rgb(238, 238, 238);
}
.dark {
  background-color: rgb(58, 59, 60) !important;
}
#renderer {
  position: absolute;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}
.overlay {
  position: relative;
  z-index: 2;
  text-align: center;
}
.overlay-abs {
  position: absolute;
  z-index: 2;
  text-align: center;
  width: 100%;
  height: 100%;
}
.bg-img {
  background-position: center;
  background-repeat: no-repeat;
  /*background-attachment: fixed;*/
}
.cover-all {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: center;
}
.radial-bg {
  transition: all 0.5s ease-out;
  background: radial-gradient(
    circle,
    rgba(60, 94, 128, 0.8519782913165266) 0%,
    rgba(63, 123, 135, 0.13489145658263302) 100%
  );
  opacity: 1;
}
.radial-bg:hover {
  background: radial-gradient(
    circle,
    rgba(60, 94, 128, 0.8519782913165266) 0%,
    rgba(63, 123, 135, 0.13489145658263302) 100%
  );
  opacity: 0.5;
}
.vertical-center {
  margin: 0;
  top: 50%;
  -ms-transform: translateY(-50%);
  transform: translateY(-50%);
  z-index: 2;
}
</style>
