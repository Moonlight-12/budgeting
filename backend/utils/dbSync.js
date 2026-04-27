const { MongoClient } = require("mongodb");

const DB_NAME = "budgeting";
const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const COLLECTIONS = ["users", "transactions", "categories", "budgets", "budgetsavings", "savingsgoals"];

function normalizeUri(uri) {
  const base = uri.replace(/\/$/, "");
  const afterHost = base.split(".net")[1] ?? "";
  return !afterHost || afterHost === "/" || afterHost === ""
    ? `${base}/${DB_NAME}`
    : base;
}

async function syncOnce(primaryDb, secondaryDb) {
  let total = 0;
  for (const name of COLLECTIONS) {
    try {
      const docs = await primaryDb.collection(name).find({}).toArray();
      if (docs.length === 0) continue;
      const coll = secondaryDb.collection(name);
      const bulk = coll.initializeUnorderedBulkOp();
      for (const doc of docs) {
        bulk.find({ _id: doc._id }).upsert().replaceOne(doc);
      }
      await bulk.execute();
      total += docs.length;
    } catch (err) {
      console.error(`[Sync] Failed to sync "${name}":`, err.message);
    }
  }
  console.log(`[Sync] Synced ${total} documents at ${new Date().toISOString()}`);
}

async function startSync() {
  if (!process.env.MONGODB_URI_SECONDARY) return;

  async function run() {
    let primaryClient, secondaryClient;
    try {
      primaryClient = new MongoClient(normalizeUri(process.env.MONGODB_URI), { serverSelectionTimeoutMS: 10000 });
      secondaryClient = new MongoClient(normalizeUri(process.env.MONGODB_URI_SECONDARY), { serverSelectionTimeoutMS: 10000 });

      await primaryClient.connect();
      await secondaryClient.connect();
      console.log("[Sync] Connected to both databases");

      const primaryDb = primaryClient.db(DB_NAME);
      const secondaryDb = secondaryClient.db(DB_NAME);

      await syncOnce(primaryDb, secondaryDb);

      setInterval(async () => {
        try {
          await syncOnce(primaryDb, secondaryDb);
        } catch (err) {
          console.error("[Sync] Interval sync failed:", err.message);
        }
      }, SYNC_INTERVAL_MS);
    } catch (err) {
      console.error("[Sync] Connection failed:", err.message);
      if (primaryClient) await primaryClient.close().catch(() => {});
      if (secondaryClient) await secondaryClient.close().catch(() => {});
      setTimeout(run, 30 * 1000);
    }
  }

  run();
}

module.exports = { startSync };
