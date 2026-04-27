const app = require('./app');
const { startSync } = require('./utils/dbSync');
const { startWeeklyBackup } = require('./utils/weeklyBackup');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    startSync();
    startWeeklyBackup();
  }
});