const express = require('express');
const rateLimit = require('express-rate-limit');
const { getDatabase } = require('../db/database');
const { comparePassword, hashPassword } = require('../utils/password');

const router = express.Router();

// Rate limiter for login: 5 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/v1/auth/signup - self-register a candidate account
router.post('/signup', async (req, res) => {
  try {
    const { name, email, cohort, password } = req.body;
    if (!name || !name.trim() || !email || !email.trim() || !cohort || !cohort.trim() || !password) {
      return res.status(400).json({ error: 'Name, email, cohort and password are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Enter a valid email address' });
    }
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const db = getDatabase();
    if (db.prepare('SELECT id FROM accounts WHERE email = ?').get(email.trim())) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    const passwordHash = await hashPassword(password);
    const accountResult = db.prepare(
      'INSERT INTO accounts (email, password_hash, role, must_change_password, password_version) VALUES (?, ?, ?, 0, 1)'
    ).run(email.trim(), passwordHash, 'Candidate');
    db.prepare('INSERT INTO learners (display_name, cohort, account_id) VALUES (?, ?, ?)')
      .run(name.trim(), cohort.trim(), accountResult.lastInsertRowid);
    return res.status(201).json({ message: 'Candidate account created. You can now sign in.' });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDatabase();
    const account = db.prepare('SELECT * FROM accounts WHERE email = ?').get(email);

    if (!account) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await comparePassword(password, account.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check temp password expiry
    if (account.temp_password_expiry) {
      const expiry = new Date(account.temp_password_expiry);
      if (new Date() > expiry) {
        return res.status(401).json({ error: 'Temporary password has expired. Contact your coordinator.' });
      }
    }

    // Get display name for candidates
    let displayName = null;
    let cohort = null;
    if (account.role === 'Candidate') {
      const learner = db.prepare('SELECT display_name, cohort FROM learners WHERE account_id = ?').get(account.id);
      if (learner) {
        displayName = learner.display_name;
        cohort = learner.cohort;
      }
    } else {
      displayName = 'Coordinator';
    }

    const mustChangePassword = !!account.must_change_password;

    // Set session
    req.session.userId = account.id;
    req.session.role = account.role;
    req.session.mustChangePassword = mustChangePassword;
    req.session.displayName = displayName;
    req.session.cohort = cohort;
    req.session.passwordVersion = account.password_version;

    return res.status(200).json({
      userId: account.id,
      role: account.role,
      mustChangePassword,
      displayName,
      cohort,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/auth/change-password
router.post('/change-password', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const db = getDatabase();
    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.session.userId);

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const valid = await comparePassword(currentPassword, account.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await hashPassword(newPassword);
    const newVersion = (account.password_version || 1) + 1;

    db.prepare(
      'UPDATE accounts SET password_hash = ?, must_change_password = 0, temp_password_expiry = NULL, password_version = ? WHERE id = ?'
    ).run(newHash, newVersion, account.id);

    // Regenerate session
    const sessionData = {
      userId: req.session.userId,
      role: req.session.role,
      mustChangePassword: false,
      displayName: req.session.displayName,
      cohort: req.session.cohort || null,
      passwordVersion: newVersion,
    };

    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      Object.assign(req.session, sessionData);
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('Session save error:', saveErr);
          return res.status(500).json({ error: 'Internal server error' });
        }
        return res.status(204).end();
      });
    });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.clearCookie('connect.sid');
    return res.status(204).end();
  });
});

// GET /api/v1/auth/me
router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  return res.status(200).json({
    userId: req.session.userId,
    role: req.session.role,
    mustChangePassword: req.session.mustChangePassword,
    displayName: req.session.displayName,
    cohort: req.session.cohort || null,
  });
});

module.exports = router;
