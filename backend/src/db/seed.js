require('dotenv').config();

const { getDatabase, initDatabaseAsync } = require('./database');
const { hashPassword } = require('../utils/password');

async function seed() {
  const db = getDatabase();

  console.log('Seeding database...');

  // --- Coordinator account ---
  const coordPassword = process.env.COORDINATOR_PASSWORD || 'Coord!n@t0r1';
const existingCoord = db.prepare(
  "SELECT id FROM accounts WHERE email = 'coordinator@tracker.local'"
).get();

const coordHash = await hashPassword(coordPassword);

if (!existingCoord) {
  db.prepare(
    'INSERT INTO accounts (email, password_hash, role, must_change_password, password_version) VALUES (?, ?, ?, 0, 1)'
  ).run('coordinator@tracker.local', coordHash, 'Coordinator');

  console.log('  Created coordinator account');
} else {
  db.prepare(
    'UPDATE accounts SET password_hash = ?, role = ?, must_change_password = 0, password_version = 1 WHERE id = ?'
  ).run(coordHash, 'Coordinator', existingCoord.id);

  console.log('  Updated coordinator password');
}

  // --- Candidate accounts and learners ---
  const candidates = [
    { name: 'Jordan Lee', email: 'jordan.lee@example.com', cohort: 'Frontend', password: 'Candidate1!' },
    { name: 'Morgan Chen', email: 'morgan.chen@example.com', cohort: 'Frontend', password: 'Candidate2!' },
    { name: 'Casey Rivera', email: 'casey.rivera@example.com', cohort: 'Frontend', password: 'Candidate3!' },
  ];

  for (const candidate of candidates) {
    const existingAccount = db.prepare('SELECT id FROM accounts WHERE email = ?').get(candidate.email);

    if (!existingAccount) {
      const hash = await hashPassword(candidate.password);
      const accountResult = db.prepare(
        'INSERT INTO accounts (email, password_hash, role, must_change_password, password_version) VALUES (?, ?, ?, 0, 1)'
      ).run(candidate.email, hash, 'Candidate');

      db.prepare(
        'INSERT INTO learners (display_name, cohort, account_id) VALUES (?, ?, ?)'
      ).run(candidate.name, candidate.cohort, accountResult.lastInsertRowid);

      console.log(`  Created candidate: ${candidate.name}`);
    } else {
      console.log(`  Candidate ${candidate.name} already exists, skipping`);
    }
  }

  // --- Activities ---
  const activities = [
    { title: 'React Basics', topic: 'Frontend', plannedHours: 6 },
    { title: 'REST APIs', topic: 'Backend', plannedHours: 8 },
    { title: 'SQL Foundations', topic: 'Data', plannedHours: 4 },
    { title: 'Node.js Essentials', topic: 'Backend', plannedHours: 10 },
  ];

  for (const activity of activities) {
    const existing = db.prepare('SELECT id FROM activities WHERE title = ?').get(activity.title);
    if (!existing) {
      db.prepare(
        'INSERT INTO activities (title, topic, planned_hours) VALUES (?, ?, ?)'
      ).run(activity.title, activity.topic, activity.plannedHours);
      console.log(`  Created activity: ${activity.title}`);
    } else {
      console.log(`  Activity ${activity.title} already exists, skipping`);
    }
  }

  // --- Assignments ---
  // Helper to get IDs
  function getLearnerId(name) {
    return db.prepare('SELECT id FROM learners WHERE display_name = ?').get(name)?.id;
  }
  function getActivityId(title) {
    return db.prepare('SELECT id FROM activities WHERE title = ?').get(title)?.id;
  }

  const assignmentsData = [
    { learner: 'Jordan Lee', activity: 'React Basics', status: 'In Progress' },
    { learner: 'Jordan Lee', activity: 'REST APIs', status: 'Not Started' },
    { learner: 'Jordan Lee', activity: 'SQL Foundations', status: 'Completed' },
    { learner: 'Morgan Chen', activity: 'React Basics', status: 'Completed' },
    { learner: 'Morgan Chen', activity: 'REST APIs', status: 'Completed' },
    { learner: 'Casey Rivera', activity: 'SQL Foundations', status: 'Not Started' },
    { learner: 'Casey Rivera', activity: 'Node.js Essentials', status: 'In Progress' },
    { learner: 'Casey Rivera', activity: 'React Basics', status: 'Completed' },
  ];

  for (const asgn of assignmentsData) {
    const learnerId = getLearnerId(asgn.learner);
    const activityId = getActivityId(asgn.activity);

    if (!learnerId || !activityId) {
      console.log(`  Skipping assignment: ${asgn.learner} -> ${asgn.activity} (missing IDs)`);
      continue;
    }

    const existing = db.prepare(
      'SELECT id FROM assignments WHERE learner_id = ? AND activity_id = ?'
    ).get(learnerId, activityId);

    if (!existing) {
      db.prepare(
        'INSERT INTO assignments (learner_id, activity_id, status) VALUES (?, ?, ?)'
      ).run(learnerId, activityId, asgn.status);
      console.log(`  Created assignment: ${asgn.learner} -> ${asgn.activity} (${asgn.status})`);
    } else {
      console.log(`  Assignment ${asgn.learner} -> ${asgn.activity} already exists, skipping`);
    }
  }

  console.log('Seeding complete!');
}

initDatabaseAsync()
  .then(() => seed())
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  });