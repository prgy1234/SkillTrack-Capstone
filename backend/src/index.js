
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const { createClient } = require('redis');
const { RedisStore } = require('connect-redis');

const { initDatabaseAsync, getDatabase } = require('./db/database');
const authRoutes = require('./routes/auth');
const activitiesRoutes = require('./routes/activities');
const learnersRoutes = require('./routes/learners');
const assignmentsRoutes = require('./routes/assignments');
const cohortSummaryRoutes = require('./routes/cohortSummary');

const app = express();
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing
app.use(express.json());

// CSRF protection via Content-Type check for state-changing methods
app.use((req, res, next) => {
  const stateMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  if (stateMethods.includes(req.method)) {
    const contentType = req.headers['content-type'] || '';

    if (!contentType.includes('application/json')) {
      return res.status(403).json({
        error: 'Content-Type must be application/json',
      });
    }
  }

  next();
});

// Session configuration
let redisClient;
let sessionStore;

if (isProduction) {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is required in production');
  }

  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is required in production');
  }

  redisClient = createClient({
    url: process.env.REDIS_URL,
  });

  redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
  });

  sessionStore = new RedisStore({
    client: redisClient,
    prefix: 'learning-tracker:',
  });
}

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'local-development-only-change-before-deploying',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    maxAge: 2 * 60 * 60 * 1000,
  },
}));

// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/activities', activitiesRoutes);
app.use('/api/v1/learners', learnersRoutes);
app.use('/api/v1/assignments', assignmentsRoutes);

app.use('/api/v1/me/assignments', (req, res, next) => {
  req.url = '/me';
  assignmentsRoutes(req, res, next);
});

app.use('/api/v1/cohort-summary', cohortSummaryRoutes);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handling middleware
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);

  res.status(500).json({
    error: 'Internal server error',
  });
});

// Start server only if this file is run directly
if (require.main === module) {
  const startServer = async () => {
    try {
      // Connect Redis before accepting requests
      if (redisClient) {
        await redisClient.connect();
        console.log('Redis connected successfully');
      }

      // Initialize database
      await initDatabaseAsync();

      // Start Express server
      app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    } catch (err) {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  };

  startServer();
}

module.exports = { app, initDatabaseAsync };
