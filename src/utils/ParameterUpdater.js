/*
interface Object {
    id: string;
    elementId: string;
    parameters: {
        id: string;
        speckle_type: "Base";
        applicatoinId: null;
        totalChildrenCount: 0;
        EXAMPLE_PARAM {
            id: string;
            name: string;
            value: any;
            isShared: boolean;
            isReadOnly: false;
            speckle_type: string;
            isTypeParameter: boolean;
            totalChildrenCount: 0;
            applicationUnitType: string;
            applicationInternalName: string;
        }[]
    }
}
*/

export class ParameterObject {
  constructor({
    id,
    name,
    value,
    isShared,
    isReadOnly,
    speckle_type,
    isTypeParameter,
    totalChlidrenCount,
    applicationUnitType,
    applicationInternalName,
  }) {
    this.id = `${id}-ParameterUpdater-${new Date().getTime()}`;
    this.name = name;
    this.value = value;
    this.isShared = isShared;
    this.isReadOnly = isReadOnly;
    this.speckle_type = speckle_type;
    this.isTypeParameter = isTypeParameter;
    this.totalChlidrenCount = totalChlidrenCount;
    this.applicationUnitType = applicationUnitType;
    this.applicationInternalName = applicationInternalName;
  }
}

export class SpeckleObject {
  constructor({ id, elementId, units, parameters }) {
    this.id = `${id}-ParameterUpdater-${new Date().getTime()}`;
    this.elementId = elementId;
    this.units = units;
    this.globalParams = {
      id: `${parameters.id}-ParameterUpdater-${new Date().getTime()}`,
      speckle_type: parameters.speckle_type,
      applicatoinId: parameters.applicatoinId,
      totalChildrenCount: parameters.totalChildrenCount,
    };
    const parameterArr = Object.values(parameters);
    const paramFilter = parameterArr.filter(
      (p) => typeof p === "object" && p !== null
    );
    this.parameters = paramFilter.map((p) => new ParameterObject(p));
  }
}

export class ParameterUpdater {
  objects = []; // ParameterObject[];
  constructor(streamid) {
    this.tmpstreamid = streamid;
    this.streamid = "67899fd79d";
  }
  addObjects(objects /* objects directly from graphql */) {
    objects.forEach((object) => {
      this.objects.push(new SpeckleObject(object.data));
    });
  }
  async commitObjects() {
      // add each object to a speckle object and push that up
    const formData = new FormData();
    const tojson = this.objects.map((o) => ({
      id: o.id,
      units: o.units,
      elementId: o.elementId,
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
        Authorization: "Bearer cec55758d273f041819465820c8b5793d40231fb37",
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
      "@Data": [
        [
          this.objects.map((o) => ({
            referencedId: o.id,
            speckle_type: "reference",
          })),
        ],
      ],
      __closure: Object.fromEntries(this.objects.map((o) => [o.id, 1])),
    };
    parentObjform.append("batch1", new Blob([JSON.stringify([parentObjData])]));

    await fetch(`https://v2.speckle.arup.com/objects/${this.streamid}`, {
      method: "POST",
      headers: {
        Authorization: "Bearer cec55758d273f041819465820c8b5793d40231fb37",
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
  }
}

export async function speckleFetch(query) {
  try {
    const res = await fetch(`https://v2.speckle.arup.com/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer cec55758d273f041819465820c8b5793d40231fb37",
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
