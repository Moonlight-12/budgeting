require('dotenv').config();

const express = require('express')
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const app = express()
const connectDB = require('./config/db');
const { isReadOnly } = require('./config/db');
const { authLimiter, apiLimiter } = require('./middleware/rateLimit');

// Ensure DB is connected before every request (safe for serverless cold starts)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// Security headers
app.use(helmet({ crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" } }));

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
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Rate limiting
app.use("/api/v1", apiLimiter);
app.use("/api/v1/auth", authLimiter);

// Block writes when running on secondary (read-only failover mode)
app.use("/api/v1", (req, res, next) => {
  if (isReadOnly() && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    // Allow auth so users can still sign in/out during an outage
    if (req.path.startsWith("/auth/")) return next();
    return res.status(503).json({
      message: "Service is in read-only mode while the primary database recovers. Please try again shortly.",
    });
  }
  next();
});

app.use("/api/v1", require("./config/routes"));

app.get('/', (req, res) => {
  res.send('ok')
})

// Temporary — remove after finding outbound IP
app.get('/debug/ip', async (req, res) => {
  const r = await fetch('https://api.ipify.org?format=json');
  const data = await r.json();
  res.json(data);
});

module.exports = app;
