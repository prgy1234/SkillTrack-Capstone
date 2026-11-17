const express = require('express');
const { getDatabase } = require('../db/database');
const { requireAuth, requireCoordinator, requirePasswordChanged } = require('../middleware/auth');
const { generateTempPassword, hashPassword } = require('../utils/password');

const router = express.Router();

// All learner routes are coordinator-only
router.use(requireAuth, requirePasswordChanged, requireCoordinator);

// GET /api/v1/learners - list all learners
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const learners = db.prepare(`
      SELECT l.id, l.display_name AS displayName, l.cohort, a.email
      FROM learners l
      LEFT JOIN accounts a ON l.account_id = a.id
    `).all();

    return res.status(200).json(learners);
  } catch (err) {
    console.error('List learners error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/learners - create a new candidate learner
router.post('/', async (req, res) => {
  try {
    const { name, email, cohort } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!cohort || !cohort.trim()) {
      return res.status(400).json({ error: 'Cohort is required' });
    }

    const db = getDatabase();

    // Check email uniqueness (case-insensitive via COLLATE NOCASE)
    const existing = db.prepare('SELECT id FROM accounts WHERE email = ?').get(email.trim());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Create account
    const accountResult = db.prepare(
      'INSERT INTO accounts (email, password_hash, role, must_change_password, temp_password_expiry, password_version) VALUES (?, ?, ?, 1, ?, 1)'
    ).run(email.trim(), passwordHash, 'Candidate', expiry);

    // Create learner
    const learnerResult = db.prepare(
      'INSERT INTO learners (display_name, cohort, account_id) VALUES (?, ?, ?)'
    ).run(name.trim(), cohort.trim(), accountResult.lastInsertRowid);

    const learner = db.prepare(`
      SELECT l.id, l.display_name AS displayName, l.cohort, a.email
      FROM learners l
      JOIN accounts a ON l.account_id = a.id
      WHERE l.id = ?
    `).get(learnerResult.lastInsertRowid);

    res.set('Cache-Control', 'no-store');
    return res.status(201).json({
      learner,
      credentials: {
        email: email.trim(),
        temporaryPassword: tempPassword,
      },
    });
  } catch (err) {
    console.error('Create learner error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// DELETE /api/v1/learners/:id - remove learner, assignments and associated account
router.delete('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const learner = db.prepare('SELECT id, account_id FROM learners WHERE id = ?').get(req.params.id);
    if (!learner) return res.status(404).json({ error: 'Learner not found' });
    db.prepare('DELETE FROM assignments WHERE learner_id = ?').run(learner.id);
    db.prepare('DELETE FROM learners WHERE id = ?').run(learner.id);
    if (learner.account_id) db.prepare('DELETE FROM accounts WHERE id = ?').run(learner.account_id);
    return res.status(204).end();
  } catch (err) {
    console.error('Delete learner error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/learners/:id/assignments - get learner's assignments with activity details
router.get('/:id/assignments', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const learner = db.prepare('SELECT * FROM learners WHERE id = ?').get(id);
    if (!learner) {
      return res.status(404).json({ error: 'Learner not found' });
    }

    const assignments = db.prepare(`
      SELECT
        asgn.id,
        asgn.learner_id AS learnerId,
        asgn.activity_id AS activityId,
        asgn.status,
        act.title,
        act.topic,
        act.planned_hours AS plannedHours
      FROM assignments asgn
      JOIN activities act ON asgn.activity_id = act.id
      WHERE asgn.learner_id = ?
    `).all(id);

    return res.status(200).json(assignments);
  } catch (err) {
    console.error('Get learner assignments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/learners/:id/reset-password - reset a learner's password
router.post('/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const learner = db.prepare('SELECT * FROM learners WHERE id = ?').get(id);
    if (!learner) {
      return res.status(404).json({ error: 'Learner not found' });
    }

    if (!learner.account_id) {
      return res.status(404).json({ error: 'No account associated with this learner' });
    }

    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(learner.account_id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const newVersion = (account.password_version || 1) + 1;

    db.prepare(
      'UPDATE accounts SET password_hash = ?, must_change_password = 1, temp_password_expiry = ?, password_version = ? WHERE id = ?'
    ).run(passwordHash, expiry, newVersion, learner.account_id);

    res.set('Cache-Control', 'no-store');
    return res.status(200).json({
      credentials: {
        email: account.email,
        temporaryPassword: tempPassword,
      },
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
