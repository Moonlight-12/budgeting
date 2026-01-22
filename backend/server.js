require('dotenv').config();

const express = require('express')
const app = express()
const connectDB = require('./config/db');

// connect to mongoDB
connectDB();

app.use(express.json());

app.use("/api/v1", require("./config/routes"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// respond with "hello world" when a GET request is made to the homepage
app.get('/', (req, res) => {
  res.send('hello world')
})