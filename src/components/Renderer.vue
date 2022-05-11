<template>
  <div
    ref="rendererparent"
    id="rendererparent"
    style="height: 700px; width: 100%"
  ></div>
</template>
<script>
import { Viewer } from "@speckle/viewer";

export default {
  name: "Renderer",
  data() {
    return {
      objectUrls: [
        "https://speckle.xyz/streams/b13799ec6e/objects/53264b899abe99d88737eee58bcb2b57",
      ],
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
        window.__viewer = new Viewer({ container: renderDomElement });
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
