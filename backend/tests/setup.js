const path = require('path');
const os = require('os');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const { hashPassword } = require('../src/utils/password');
const dbModule = require('../src/db/database');

let db;
let app;
let testDbPath;

async function setupTestApp() {
  testDbPath = path.join(os.tmpdir(), `learning-tracker-test-${process.pid}-${Date.now()}.db`);
  db = await dbModule.initializeDatabase(testDbPath);
  dbModule.getDatabase = () => db;

  const coordHash = await hashPassword('Coord!n@t0r1');
  db.prepare(
    'INSERT INTO accounts (email, password_hash, role, must_change_password, password_version) VALUES (?, ?, ?, 0, 1)'
  ).run('coordinator@tracker.local', coordHash, 'Coordinator');

  const candidates = [
    { name: 'Jordan Lee', email: 'jordan.lee@example.com', password: 'Candidate1!' },
    { name: 'Morgan Chen', email: 'morgan.chen@example.com', password: 'Candidate2!' },
    { name: 'Casey Rivera', email: 'casey.rivera@example.com', password: 'Candidate3!' },
  ];

  for (const candidate of candidates) {
    const hash = await hashPassword(candidate.password);
    const result = db.prepare(
      'INSERT INTO accounts (email, password_hash, role, must_change_password, password_version) VALUES (?, ?, ?, 0, 1)'
    ).run(candidate.email, hash, 'Candidate');
    db.prepare(
      'INSERT INTO learners (display_name, cohort, account_id) VALUES (?, ?, ?)'
    ).run(candidate.name, 'Frontend', result.lastInsertRowid);
  }

  const mustChangeHash = await hashPassword('TempPass1!');
  const mustChangeResult = db.prepare(
    'INSERT INTO accounts (email, password_hash, role, must_change_password, temp_password_expiry, password_version) VALUES (?, ?, ?, 1, ?, 1)'
  ).run('newcandidate@example.com', mustChangeHash, 'Candidate', new Date(Date.now() + 86400000).toISOString());
  db.prepare(
    'INSERT INTO learners (display_name, cohort, account_id) VALUES (?, ?, ?)'
  ).run('New Candidate', 'Frontend', mustChangeResult.lastInsertRowid);

  const activities = [
    ['React Basics', 'Frontend', 6],
    ['REST APIs', 'Backend', 8],
    ['SQL Foundations', 'Data', 4],
    ['Node.js Essentials', 'Backend', 10],
  ];
  for (const activity of activities) {
    db.prepare('INSERT INTO activities (title, topic, planned_hours) VALUES (?, ?, ?)').run(...activity);
  }

  const jordanId = db.prepare("SELECT id FROM learners WHERE display_name = 'Jordan Lee'").get().id;
  const reactId = db.prepare("SELECT id FROM activities WHERE title = 'React Basics'").get().id;
  const restId = db.prepare("SELECT id FROM activities WHERE title = 'REST APIs'").get().id;
  const sqlId = db.prepare("SELECT id FROM activities WHERE title = 'SQL Foundations'").get().id;
  db.prepare('INSERT INTO assignments (learner_id, activity_id, status) VALUES (?, ?, ?)').run(jordanId, reactId, 'In Progress');
  db.prepare('INSERT INTO assignments (learner_id, activity_id, status) VALUES (?, ?, ?)').run(jordanId, restId, 'Not Started');
  db.prepare('INSERT INTO assignments (learner_id, activity_id, status) VALUES (?, ?, ?)').run(jordanId, sqlId, 'Completed');

  app = express();
  app.use(express.json());
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: false },
  }));
  app.use((req, res, next) => {
    const stateMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (stateMethods.includes(req.method)) {
      const contentType = req.headers['content-type'] || '';
      if (!contentType.includes('application/json')) {
        return res.status(403).json({ error: 'Content-Type must be application/json' });
      }
    }
    next();
  });

  const routeModules = [
    '../src/routes/auth',
    '../src/routes/activities',
    '../src/routes/learners',
    '../src/routes/assignments',
    '../src/routes/cohortSummary',
    '../src/middleware/auth',
  ];
  routeModules.forEach((modulePath) => {
    delete require.cache[require.resolve(modulePath)];
  });

  app.use('/api/v1/auth', require('../src/routes/auth'));
  app.use('/api/v1/activities', require('../src/routes/activities'));
  app.use('/api/v1/learners', require('../src/routes/learners'));
  const assignmentsRoutes = require('../src/routes/assignments');
  app.use('/api/v1/assignments', assignmentsRoutes);
  app.use('/api/v1/me/assignments', (req, res, next) => {
    req.url = '/me';
    assignmentsRoutes(req, res, next);
  });
  app.use('/api/v1/cohort-summary', require('../src/routes/cohortSummary'));

  return { app, db };
}

function getApp() { return app; }
function getDb() { return db; }

function closeDb() {
  if (db && db._db && typeof db._db.close === 'function') db._db.close();
  db = null;
  if (testDbPath && fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  testDbPath = null;
}

module.exports = { setupTestApp, getApp, getDb, closeDb };
