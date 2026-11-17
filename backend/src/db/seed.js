
require('dotenv').config();

const { getDatabase, initDatabaseAsync } = require('./database');
const { hashPassword } = require('../utils/password');

async function seed() {
  const db = getDatabase();

  console.log('Seeding database...');

  // ==========================================
  // COORDINATOR ACCOUNT
  // ==========================================

  const coordinator = {
    name: 'Alex Morgan',
    email: 'alex.morgan@skilltrack.com',
    password: process.env.COORDINATOR_PASSWORD || 'Alex@Track2026!',
    role: 'Coordinator'
  };

  // Find an existing coordinator, including the old demo account.
  const existingCoordinator = db.prepare(`
    SELECT id, email
    FROM accounts
    WHERE role = 'Coordinator'
       OR email = 'coordinator@tracker.local'
       OR email = ?
    LIMIT 1
  `).get(coordinator.email);

  const coordinatorHash = await hashPassword(coordinator.password);

  if (existingCoordinator) {
    db.prepare(`
      UPDATE accounts
      SET email = ?,
          password_hash = ?,
          role = ?,
          must_change_password = 0,
          password_version = 1
      WHERE id = ?
    `).run(
      coordinator.email,
      coordinatorHash,
      coordinator.role,
      existingCoordinator.id
    );

    console.log('  Updated coordinator account');
  } else {
    db.prepare(`
      INSERT INTO accounts
      (email, password_hash, role, must_change_password, password_version)
      VALUES (?, ?, ?, 0, 1)
    `).run(
      coordinator.email,
      coordinatorHash,
      coordinator.role
    );

    console.log('  Created coordinator account');
  }

  // ==========================================
  // CANDIDATE ACCOUNTS
  // ==========================================

  const candidates = [
    {
      oldEmail: 'jordan.lee@example.com',
      oldName: 'Jordan Lee',
      name: 'Olivia Parker',
      email: 'olivia.parker@example.com',
      cohort: 'Frontend',
      password: 'Olivia@2026!'
    },
    {
      oldEmail: 'morgan.chen@example.com',
      oldName: 'Morgan Chen',
      name: 'Ethan Brooks',
      email: 'ethan.brooks@example.com',
      cohort: 'Backend',
      password: 'Ethan@2026!'
    },
    {
      oldEmail: 'casey.rivera@example.com',
      oldName: 'Casey Rivera',
      name: 'Sophia Bennett',
      email: 'sophia.bennett@example.com',
      cohort: 'Full Stack',
      password: 'Sophia@2026!'
    }
  ];

  for (const candidate of candidates) {
    const existingAccount = db.prepare(`
      SELECT id
      FROM accounts
      WHERE email IN (?, ?)
      LIMIT 1
    `).get(candidate.email, candidate.oldEmail);

    const candidateHash = await hashPassword(candidate.password);

    if (existingAccount) {
      db.prepare(`
        UPDATE accounts
        SET email = ?,
            password_hash = ?,
            role = 'Candidate',
            must_change_password = 0,
            password_version = 1
        WHERE id = ?
      `).run(
        candidate.email,
        candidateHash,
        existingAccount.id
      );

      const existingLearner = db.prepare(
        'SELECT id FROM learners WHERE account_id = ?'
      ).get(existingAccount.id);

      if (existingLearner) {
        db.prepare(`
          UPDATE learners
          SET display_name = ?, cohort = ?
          WHERE account_id = ?
        `).run(
          candidate.name,
          candidate.cohort,
          existingAccount.id
        );
      } else {
        db.prepare(`
          INSERT INTO learners (display_name, cohort, account_id)
          VALUES (?, ?, ?)
        `).run(
          candidate.name,
          candidate.cohort,
          existingAccount.id
        );
      }

      console.log(`  Updated candidate: ${candidate.name}`);

    } else {
      const accountResult = db.prepare(`
        INSERT INTO accounts
        (email, password_hash, role, must_change_password, password_version)
        VALUES (?, ?, 'Candidate', 0, 1)
      `).run(
        candidate.email,
        candidateHash
      );

      db.prepare(`
        INSERT INTO learners (display_name, cohort, account_id)
        VALUES (?, ?, ?)
      `).run(
        candidate.name,
        candidate.cohort,
        accountResult.lastInsertRowid
      );

      console.log(`  Created candidate: ${candidate.name}`);
    }
  }

  // ==========================================
  // ACTIVITIES
  // ==========================================

  const activities = [
    {
      title: 'React Basics',
      topic: 'Frontend',
      plannedHours: 6
    },
    {
      title: 'REST APIs',
      topic: 'Backend',
      plannedHours: 8
    },
    {
      title: 'SQL Foundations',
      topic: 'Database',
      plannedHours: 4
    },
    {
      title: 'Node.js Essentials',
      topic: 'Backend',
      plannedHours: 10
    }
  ];

  for (const activity of activities) {
    const existing = db.prepare(
      'SELECT id FROM activities WHERE title = ?'
    ).get(activity.title);

    if (!existing) {
      db.prepare(`
        INSERT INTO activities (title, topic, planned_hours)
        VALUES (?, ?, ?)
      `).run(
        activity.title,
        activity.topic,
        activity.plannedHours
      );

      console.log(`  Created activity: ${activity.title}`);
    } else {
      console.log(`  Activity ${activity.title} already exists`);
    }
  }

  // ==========================================
  // ASSIGNMENTS
  // ==========================================

  function getLearnerId(name) {
    return db.prepare(
      'SELECT id FROM learners WHERE display_name = ?'
    ).get(name)?.id;
  }

  function getActivityId(title) {
    return db.prepare(
      'SELECT id FROM activities WHERE title = ?'
    ).get(title)?.id;
  }

  const assignmentsData = [
    {
      learner: 'Olivia Parker',
      activity: 'React Basics',
      status: 'In Progress'
    },
    {
      learner: 'Olivia Parker',
      activity: 'REST APIs',
      status: 'Not Started'
    },
    {
      learner: 'Olivia Parker',
      activity: 'SQL Foundations',
      status: 'Completed'
    },
    {
      learner: 'Ethan Brooks',
      activity: 'React Basics',
      status: 'Completed'
    },
    {
      learner: 'Ethan Brooks',
      activity: 'REST APIs',
      status: 'Completed'
    },
    {
      learner: 'Sophia Bennett',
      activity: 'SQL Foundations',
      status: 'Not Started'
    },
    {
      learner: 'Sophia Bennett',
      activity: 'Node.js Essentials',
      status: 'In Progress'
    },
    {
      learner: 'Sophia Bennett',
      activity: 'React Basics',
      status: 'Completed'
    }
  ];

  for (const assignment of assignmentsData) {
    const learnerId = getLearnerId(assignment.learner);
    const activityId = getActivityId(assignment.activity);

    if (!learnerId || !activityId) {
      console.log(
        `  Skipping assignment: ${assignment.learner}`
      );
      continue;
    }

    const existing = db.prepare(`
      SELECT id
      FROM assignments
      WHERE learner_id = ? AND activity_id = ?
    `).get(learnerId, activityId);

    if (!existing) {
      db.prepare(`
        INSERT INTO assignments (learner_id, activity_id, status)
        VALUES (?, ?, ?)
      `).run(
        learnerId,
        activityId,
        assignment.status
      );

      console.log(
        `  Created assignment: ${assignment.learner} -> ${assignment.activity}`
      );
    } else {
      console.log(
        `  Assignment already exists: ${assignment.learner} -> ${assignment.activity}`
      );
    }
  }

  console.log('Seeding complete!');
}

initDatabaseAsync()
  .then(() => seed())
  .catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
  });
