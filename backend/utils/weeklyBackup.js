const mongoose = require("mongoose");
const cron = require("node-cron");

const SOURCE_DB = "budgeting";
const BACKUP_PREFIX = "budgeting_backup_";
const KEEP_SNAPSHOTS = 4;

function normalizeUri(uri, dbName) {
  const u = new URL(uri);
  u.pathname = `/${dbName}`;
  return u.toString();
}

function todayLabel() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "_");
}

async function runBackup() {
  if (!process.env.MONGODB_URI_BACKUP) return;

  const backupDbName = `${BACKUP_PREFIX}${todayLabel()}`;
  console.log(`[Backup] Starting weekly backup → ${backupDbName}`);

  let sourceConn, backupConn;
  try {
    sourceConn = mongoose.createConnection(normalizeUri(process.env.MONGODB_URI, SOURCE_DB));
    sourceConn.on("error", (err) => console.error("[Backup] Source connection error:", err.message));
    backupConn = mongoose.createConnection(normalizeUri(process.env.MONGODB_URI_BACKUP, backupDbName));
    backupConn.on("error", (err) => console.error("[Backup] Backup connection error:", err.message));
    await sourceConn.asPromise();
    await backupConn.asPromise();

    const sourceDb = sourceConn.db;
    const backupDb = backupConn.db;

    const collections = await sourceDb.listCollections().toArray();
    for (const { name } of collections) {
      const docs = await sourceDb.collection(name).find({}).toArray();
      if (docs.length === 0) continue;
      await backupDb.collection(name).deleteMany({});
      await backupDb.collection(name).insertMany(docs);
      console.log(`[Backup]   ${name}: ${docs.length} documents`);
    }

    console.log(`[Backup] Snapshot complete: ${backupDbName}`);

    // Prune old snapshots — keep only the most recent KEEP_SNAPSHOTS
    await pruneOldBackups(backupConn);
  } catch (err) {
    console.error("[Backup] Backup failed:", err.message);
  } finally {
    if (sourceConn) await sourceConn.close().catch(() => {});
    if (backupConn) await backupConn.close().catch(() => {});
  }
}

async function pruneOldBackups(conn) {
  const adminDb = conn.db.admin();
  const { databases } = await adminDb.listDatabases();

  const backups = databases
    .map((d) => d.name)
    .filter((name) => name.startsWith(BACKUP_PREFIX))
    .sort(); // ISO date suffix sorts lexicographically = chronologically

  const toDelete = backups.slice(0, Math.max(0, backups.length - KEEP_SNAPSHOTS));
  for (const dbName of toDelete) {
    await conn.client.db(dbName).dropDatabase();
    console.log(`[Backup] Pruned old snapshot: ${dbName}`);
  }
}

function startWeeklyBackup() {
  if (!process.env.MONGODB_URI_BACKUP) {
    console.log("[Backup] MONGODB_URI_BACKUP not set, weekly backup disabled");
    return;
  }
  // Every Sunday at 02:00
  cron.schedule("0 2 * * 0", runBackup);
  console.log("[Backup] Weekly backup scheduled (Sundays at 02:00)");
}

module.exports = { startWeeklyBackup, runBackup };
