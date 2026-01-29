require('dotenv').config();

const express = require('express')
const cookieParser = require('cookie-parser');
const cors = require('cors');
const app = express()
const connectDB = require('./config/db');

// connect to mongoDB
connectDB();

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like Insomnia, curl, or server-to-server)
    if (!origin) return callback(null, true);

    const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:3000'];
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());


app.use("/api/v1", require("./config/routes"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// respond with "hello world" when a GET request is made to the homepage
app.get('/', (req, res) => {
  res.send('hello world')
})