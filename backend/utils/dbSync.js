const mongoose = require("mongoose");

const DB_NAME = "budgeting";
const RETRY_DELAY_MS = 15 * 1000;

function normalizeUri(uri) {
  // Ensure the URI ends with the DB name
  const u = new URL(uri);
  if (!u.pathname || u.pathname === "/") u.pathname = `/${DB_NAME}`;
  return u.toString();
}

async function startSync() {
  if (!process.env.MONGODB_URI_SECONDARY) return;

  let primaryConn, secondaryConn;

  async function connect() {
    primaryConn = mongoose.createConnection(normalizeUri(process.env.MONGODB_URI), {
      serverSelectionTimeoutMS: 10000,
    });
    secondaryConn = mongoose.createConnection(normalizeUri(process.env.MONGODB_URI_SECONDARY), {
      serverSelectionTimeoutMS: 10000,
    });
    await primaryConn.asPromise();
    await secondaryConn.asPromise();
    console.log("[Sync] Connected to both databases");
  }

  async function watch() {
    const primaryDb = primaryConn.db;
    const secondaryDb = secondaryConn.db;

    const changeStream = primaryDb.watch([], {
      fullDocument: "updateLookup",
    });

    changeStream.on("change", async (event) => {
      try {
        const coll = secondaryDb.collection(event.ns.coll);
        const id = event.documentKey._id;

        if (event.operationType === "insert") {
          await coll.replaceOne({ _id: id }, event.fullDocument, { upsert: true });
        } else if (event.operationType === "update" || event.operationType === "replace") {
          if (event.fullDocument) {
            await coll.replaceOne({ _id: id }, event.fullDocument, { upsert: true });
          }
        } else if (event.operationType === "delete") {
          await coll.deleteOne({ _id: id });
        }
      } catch (err) {
        console.error("[Sync] Failed to apply change:", err.message);
      }
    });

    changeStream.on("error", async (err) => {
      console.error("[Sync] Change stream error:", err.message);
      await changeStream.close().catch(() => {});
      scheduleRetry();
    });

    console.log("[Sync] Watching primary for changes...");
  }

  function scheduleRetry() {
    setTimeout(async () => {
      try {
        if (primaryConn) await primaryConn.close().catch(() => {});
        if (secondaryConn) await secondaryConn.close().catch(() => {});
        await connect();
        await watch();
      } catch (err) {
        console.error("[Sync] Reconnect failed:", err.message);
        scheduleRetry();
      }
    }, RETRY_DELAY_MS);
  }

  try {
    await connect();
    await watch();
  } catch (err) {
    console.error("[Sync] Initial connection failed:", err.message);
    scheduleRetry();
  }
}

module.exports = { startSync };
