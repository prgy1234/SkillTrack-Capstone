const { getDatabase } = require('../db/database');

/**
 * Require that the user is authenticated (has a valid session).
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Check password_version matches current account version
  const db = getDatabase();
  const account = db.prepare('SELECT password_version FROM accounts WHERE id = ?').get(req.session.userId);

  if (!account) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: 'Account not found' });
  }

  if (account.password_version !== req.session.passwordVersion) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  next();
}

/**
 * Require the Coordinator role.
 */
function requireCoordinator(req, res, next) {
  if (req.session.role !== 'Coordinator') {
    return res.status(403).json({ error: 'Coordinator access required' });
  }
  next();
}

/**
 * Require the Candidate role.
 */
function requireCandidate(req, res, next) {
  if (req.session.role !== 'Candidate') {
    return res.status(403).json({ error: 'Candidate access required' });
  }
  next();
}

/**
 * Require that the user has already changed their password (must_change_password is false).
 */
function requirePasswordChanged(req, res, next) {
  if (req.session.mustChangePassword) {
    return res.status(403).json({ error: 'You must change your password before accessing this resource' });
  }
  next();
}

/**
 * For users who must change their password, allow only change-password and logout endpoints.
 */
function allowOnlyPasswordChange(req, res, next) {
  if (req.session.mustChangePassword) {
    const allowed = [
      '/api/v1/auth/change-password',
      '/api/v1/auth/logout',
      '/api/v1/auth/me',
    ];
    if (!allowed.includes(req.path)) {
      return res.status(403).json({ error: 'You must change your password before accessing this resource' });
    }
  }
  next();
}

module.exports = {
  requireAuth,
  requireCoordinator,
  requireCandidate,
  requirePasswordChanged,
  allowOnlyPasswordChange,
};
