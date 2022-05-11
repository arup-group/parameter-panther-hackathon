<template>
<div>
  <div
      ref="rendererparent"
      id="rendererparent"
      style="height: 700px; width: 100%"
    ></div>
    <p v-if="loaded !== 100">loading... {{ loaded }}</p>
</div>
</template>
<script>
import { Viewer } from "@speckle/viewer";

export default {
  name: "Renderer",
  data() {
    return {
      objectUrls: [
        "https://speckle.xyz/streams/b13799ec6e/objects/fdd9bb528f6f09e6f3b8548791fa290e",
      ],
      loaded: 0
    };
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
        window.__viewer = new Viewer({ container: renderDomElement, showStats: false });
      }
      window.__viewer.onWindowResize();
      this.setupEvents();

      this.load();
    },
    setupEvents() {
      window.__viewer.on(
        "load-progress",
        function (args) {
          console.log("loading...", args.progress * 100);
          this.loaded = Math.round(args.progress * 100);
          this.zoomEx();
        }.bind(this),
        200
      );
    },
    load() {
      if (!this.objectUrls || this.objectUrls.length === 0) return;
      this.hasLoadedModel = true;
      this.objectUrls?.forEach((url) => {
        window.__viewer.loadObject(url);
        window.__viewerLastLoadedUrl = url;
      });
      this.setupEvents();
    },
    zoomEx() {
      window.__viewer.interactions.zoomExtents();
    },
  },
};
</script>
<style>
#renderer {
  /* position: absolute;
  top: 0; */
  width: 100%;
  height: 80vh;
}
</style>