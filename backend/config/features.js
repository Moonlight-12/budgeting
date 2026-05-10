// Feature flags — toggle via environment variables.
// ENABLE_DB_FAILOVER: secondary/backup DB sync and failover (requires Up Bank multi-user policy)
// ENABLE_PER_USER_UP_KEY: per-user encrypted Up API key stored in DB (requires Up Bank third-party policy)

const ENABLE_DB_FAILOVER = process.env.ENABLE_DB_FAILOVER === "true";
const ENABLE_PER_USER_UP_KEY = process.env.ENABLE_PER_USER_UP_KEY === "true";

module.exports = { ENABLE_DB_FAILOVER, ENABLE_PER_USER_UP_KEY };
