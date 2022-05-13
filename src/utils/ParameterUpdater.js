import store from "@/store";

export class SpeckleObject {
  constructor({ id, elementId, units, parameters }) {
    this.id = `${id}-ParameterUpdater-${new Date().getTime()}`;
    this.elementId = elementId;
    this.units = units;
    this.globalParams = {
      id: `${parameters.id}-ParameterUpdater-${new Date().getTime()}`,
      speckle_type: parameters.speckle_type,
      applicationId: null,
      totalChildrenCount: parameters.totalChildrenCount,
    };
    const parameterArr = Object.values(parameters);
    const paramFilter = parameterArr.filter(
      (p) => typeof p === "object" && p !== null
    );
    this.parameters = paramFilter.map((p) => ({
      ...p,
      id: `${p.id}-ParameterUpdater-${new Date().getTime()}`,
    }));
  }
}

export class ParameterUpdater {
  objects = []; // ParameterObject[];
  constructor(streamid) {
    this.streamid = streamid;
  }
  addObjects(objects /* objects directly from speckle */) {
    objects.forEach((object) => {
      this.objects.push(new SpeckleObject(object.data));
    });
  }

  updateParam(objId, paramId, newVal) {
    this.objects = this.objects.map((o) => {
      if (o.id.split("-")[0] !== objId) return o;
      return {
        ...o,
        parameters: o.parameters.map((p) => {
          if (p.id.split("-")[0] !== paramId) return p;
          return {
            ...p,
            value: newVal,
          };
        }),
      };
    });
  }

  async commitObjects() {
    // add each object to a speckle object and push that up
    const formData = new FormData();
    const tojson = this.objects.map((o) => ({
      id: o.id,
      units: o.units,
      elementId: o.elementId,
      speckle_type: "Objects.BuiltElements.Revit.ParameterUpdater",
      applicationId: "94033bc3dc3d835cc858-Objects.BuiltElements.Revit.ParameterUpdater",
      totalChildrenCount: 0,
      parameters: {
        ...o.globalParams,
        ...o.parameters.reduce((a, v, i) => {
          if (i === 1) {
            return {
              [a.applicationInternalName]: a,
              [v.applicationInternalName]: v,
            };
          } else {
            return {
              ...a,
              [v.applicationInternalName]: v,
            };
          }
        }),
      },
    }));
    formData.append("batch1", new Blob([JSON.stringify(tojson)]));
    await fetch(`https://v2.speckle.arup.com/objects/${this.streamid}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${store.state.token.token}`,
      },
      body: formData,
    });

    // create a new branch. Will fail after the first time this is run on a stream, but it won't stop the rest from working
    const branchName = "PARAMETER_PANTHER_TEST";
    const newBranchQuery = `mutation {
        branchCreate(branch: {
          streamId: "${this.streamid}",
          name: "${branchName}",
          description: "Testing things"
        })
      }`;

    await speckleFetch(newBranchQuery);

    // create a parent object containing each of the objects created above. Done for committing
    const parentObjId = `${new Date().getTime()}-parameterUpdater`;
    const parentObjform = new FormData();
    const parentObjData = {
      id: parentObjId,
      "@Data":
        [
          this.objects.map((o) => ({
            referencedId: o.id,
            speckle_type: "reference",
          })),
        ],
        speckle_type: "Base",
        applicationId: null,
      __closure: Object.fromEntries(this.objects.map((o) => [o.id, 1])),
    };
    parentObjform.append("batch1", new Blob([JSON.stringify([parentObjData])]));

    await fetch(`https://v2.speckle.arup.com/objects/${this.streamid}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${store.state.token.token}`,
      },
      body: parentObjform,
    });

    // make the commit and push it up
    const commitQuery = `mutation {
        commitCreate(commit: {
          streamId: "${this.streamid}",
          branchName: "${branchName}",
          objectId: "${parentObjId}",
          message: "this is a test",
          sourceApplication: "Parameter Panther",
          totalChildrenCount: ${this.objects.length},
        })
      }`;

    await speckleFetch(commitQuery);

    console.log("done!");
  }
}

export async function speckleFetch(query) {
  try {
    const res = await fetch(`https://v2.speckle.arup.com/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${store.state.token.token}`,
      },
      body: JSON.stringify({
        query: query,
      }),
    });
    return await res.json();
  } catch (err) {
    console.error("API cal failed", err);
  }
}
