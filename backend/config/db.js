const mongoose = require("mongoose");
const { ENABLE_DB_FAILOVER } = require("./features");

let usingSecondary = false;
let reconnectTimer = null;

async function _connect() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    if (usingSecondary) console.log("[DB] Reconnected to primary database");
    usingSecondary = false;
    _stopReconnectTimer();
  } catch (primaryErr) {
    if (!ENABLE_DB_FAILOVER || !process.env.MONGODB_URI_SECONDARY) {
      throw primaryErr;
    }
    console.error("[DB] Primary unavailable, failing over to secondary:", primaryErr.message);
    await mongoose.connect(process.env.MONGODB_URI_SECONDARY);
    usingSecondary = true;
    console.log("[DB] Connected to secondary database (read-only mode active)");
    _startReconnectTimer();
  }
}

function _startReconnectTimer() {
  if (reconnectTimer) return;
  reconnectTimer = setInterval(async () => {
    if (!usingSecondary) { _stopReconnectTimer(); return; }
    // Probe primary with a short-timeout test connection
    let testConn;
    try {
      testConn = mongoose.createConnection(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      await testConn.asPromise();
      await testConn.close();
      // Primary is back — switch over
      console.log("[DB] Primary is back, switching over...");
      await mongoose.disconnect();
      await _connect();
    } catch {
      if (testConn) testConn.close().catch(() => {});
    }
  }, 30 * 1000);
}

function _stopReconnectTimer() {
  if (reconnectTimer) {
    clearInterval(reconnectTimer);
    reconnectTimer = null;
  }
}

const connectDB = async () => {
  const state = mongoose.connection.readyState;
  if (state === 1 || state === 2) return; // connected or connecting
  await _connect();
};

const isReadOnly = () => usingSecondary;

module.exports = connectDB;
module.exports.isReadOnly = isReadOnly;
