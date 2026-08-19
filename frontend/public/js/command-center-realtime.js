console.log("⚡ Command Center Realtime Loaded");

const CommandCenterRealtime = (() => {

  let socket = null;

  const SOCKET_URL =
    window.SOCKET_URL ||
    "http://localhost:4000";

  function initialize() {

    if (
      typeof io !== "function"
    ) {

      console.error(
        "❌ Socket.IO client not loaded."
      );

      return;
    }

    socket =
      io(SOCKET_URL, {
        transports: [
          "websocket",
          "polling",
        ],
      });

    socket.on("connect", () => {

      console.log(
        "🟢 Command Center Socket Connected:",
        socket.id
      );

    });

    socket.on("disconnect", (reason) => {

      console.warn(
        "🔴 Command Center Socket Disconnected:",
        reason
      );

    });

    socket.on("connect_error", (error) => {

      console.error(
        "❌ Socket Connection Error:",
        error
      );

    });

    // ======================================================
    // INCIDENTS
    // ======================================================

    socket.on(
      "incident:created",
      ({ incident }) => {

        console.log(
          "🚨 Incident Created:",
          incident
        );

        CommandCenterData.upsert(
          "incidents",
          incident
        );
      }
    );

    socket.on(
      "incident:updated",
      ({ incident }) => {

        console.log(
          "🔄 Incident Updated:",
          incident
        );

        CommandCenterData.upsert(
          "incidents",
          incident
        );
      }
    );

    socket.on(
      "incident:deleted",
      ({ incidentId }) => {

        console.log(
          "🗑️ Incident Deleted:",
          incidentId
        );

        CommandCenterData.remove(
          "incidents",
          incidentId
        );
      }
    );

    // ======================================================
    // MISSIONS
    // ======================================================

    socket.on(
      "mission:created",
      ({ mission }) => {

        console.log(
          "🎯 Mission Created:",
          mission
        );

        CommandCenterData.upsert(
          "missions",
          mission
        );
      }
    );

    socket.on(
      "mission:updated",
      ({ mission }) => {

        console.log(
          "🔄 Mission Updated:",
          mission
        );

        CommandCenterData.upsert(
          "missions",
          mission
        );
      }
    );

    socket.on(
      "mission:deleted",
      ({ missionId }) => {

        console.log(
          "🗑️ Mission Deleted:",
          missionId
        );

        CommandCenterData.remove(
          "missions",
          missionId
        );
      }
    );

    // ======================================================
    // RESOURCES
    // ======================================================

    socket.on(
      "resource:created",
      ({ resource }) => {

        console.log(
          "📦 Resource Created:",
          resource
        );

        CommandCenterData.upsert(
          "resources",
          resource
        );
      }
    );

    socket.on(
      "resource:updated",
      ({ resource }) => {

        console.log(
          "🔄 Resource Updated:",
          resource
        );

        CommandCenterData.upsert(
          "resources",
          resource
        );
      }
    );

    socket.on(
      "resource:deleted",
      ({ resourceId }) => {

        console.log(
          "🗑️ Resource Deleted:",
          resourceId
        );

        CommandCenterData.remove(
          "resources",
          resourceId
        );
      }
    );

    // ======================================================
    // SOS
    // ======================================================

    socket.on(
      "sos:created",
      ({ sos }) => {

        console.log(
          "🚨 SOS Created:",
          sos
        );

        CommandCenterData.upsert(
          "sos",
          sos
        );
      }
    );

    socket.on(
      "sos:updated",
      ({ sos }) => {

        console.log(
          "🔄 SOS Updated:",
          sos
        );

        CommandCenterData.upsert(
          "sos",
          sos
        );
      }
    );

    socket.on(
      "sos:deleted",
      ({ sosId }) => {

        console.log(
          "🗑️ SOS Deleted:",
          sosId
        );

        CommandCenterData.remove(
          "sos",
          sosId
        );
      }
    );

    window.commandSocket =
      socket;
  }

  return {
    initialize,
  };

})();

window.CommandCenterRealtime =
  CommandCenterRealtime;

console.log(
  "✅ Realtime Engine Ready"
);