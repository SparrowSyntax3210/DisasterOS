"use strict";

console.log("🎯 Command Missions Loaded");

const CommandCenterMissions = (() => {

  let initialized = false;

  function getForm() {
    return (
      document.getElementById(
        "missionForm"
      ) ||
      document.querySelector(
        "[data-mission-form]"
      )
    );
  }

  function getInput(
    ...selectors
  ) {
    for (
      const selector of selectors
    ) {
      const element =
        document.querySelector(
          selector
        );

      if (element) {
        return element;
      }
    }

    return null;
  }

  function getFormData() {
    const title =
      getInput(
        "#missionTitle",
        "[name='missionTitle']",
        "[name='title']"
      )?.value?.trim();

    const priority =
      getInput(
        "#missionPriority",
        "[name='missionPriority']",
        "[name='priority']"
      )?.value || "NORMAL";

    const description =
      getInput(
        "#missionDescription",
        "[name='missionDescription']",
        "[name='description']"
      )?.value?.trim();

    const status =
      getInput(
        "#missionStatus",
        "[name='missionStatus']",
        "[name='status']"
      )?.value || "CREATED";

    const location =
      CommandCenterLocation.getLocation();

    return {
      title,
      description,
      priority,
      status,

      ...(location
        ? {
            latitude:
              location.lat,
            longitude:
              location.lng,
          }
        : {}),
    };
  }

  function validateMission(
    data
  ) {
    if (!data.title) {
      throw new Error(
        "Mission title is required."
      );
    }

    return true;
  }

  async function createMission(
    data
  ) {
    validateMission(data);

    console.log(
      "🎯 Creating mission:",
      data
    );

    const response =
      await commandApi.createMission(
        data
      );

    const mission =
      response?.mission ||
      response?.data ||
      response;

    if (mission) {
      CommandCenterData.upsert(
        "missions",
        mission
      );
    }

    CommandCenterAlerts?.show?.({
      type: "success",
      title: "Mission Created",
      message:
        data.title ||
        "New mission created.",
    });

    return response;
  }

  async function updateMission(
    id,
    data
  ) {
    if (!id) {
      throw new Error(
        "Mission ID is required."
      );
    }

    const response =
      await commandApi.updateMission(
        id,
        data
      );

    const mission =
      response?.mission ||
      response?.data ||
      response;

    if (mission) {
      CommandCenterData.upsert(
        "missions",
        mission
      );
    }

    return response;
  }

  async function deleteMission(
    id
  ) {
    if (!id) {
      throw new Error(
        "Mission ID is required."
      );
    }

    await commandApi.deleteMission(
      id
    );

    CommandCenterData.remove(
      "missions",
      id
    );

    CommandCenterAlerts?.show?.({
      type: "success",
      title: "Mission Removed",
      message:
        "Mission has been deleted.",
    });
  }

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    const form =
      getForm();

    if (!form) return;

    try {
      const data =
        getFormData();

      await createMission(
        data
      );

      form.reset();

    } catch (error) {
      console.error(
        "❌ Mission creation failed:",
        error
      );

      CommandCenterAlerts?.show?.({
        type: "critical",
        title: "Mission Failed",
        message:
          error.message ||
          "Unable to create mission.",
      });
    }
  }

  function bindForm() {
    const form =
      getForm();

    if (!form) {
      console.log(
        "ℹ️ Mission form not present."
      );

      return;
    }

    form.addEventListener(
      "submit",
      handleSubmit
    );
  }

  function initialize() {
    if (initialized) return;

    initialized = true;

    bindForm();

    console.log(
      "✅ Command Mission Engine Ready"
    );
  }

  return {
    initialize,
    createMission,
    updateMission,
    deleteMission,
  };

})();

window.CommandCenterMissions =
  CommandCenterMissions;

console.log(
  "✅ Command Missions Ready"
);