const app = require('./app');
const { ENABLE_DB_FAILOVER } = require('./config/features');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  if (ENABLE_DB_FAILOVER) {
    const { startSync } = require('./utils/dbSync');
    const { startWeeklyBackup } = require('./utils/weeklyBackup');
    startSync();
    startWeeklyBackup();
  }
});