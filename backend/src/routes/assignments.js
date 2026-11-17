const express = require('express');
const { getDatabase } = require('../db/database');
const { requireAuth, requireCoordinator, requireCandidate, requirePasswordChanged } = require('../middleware/auth');

const router = express.Router();

// POST /api/v1/assignments - create assignment (coordinator-only)
router.post('/', requireAuth, requirePasswordChanged, requireCoordinator, (req, res) => {
  try {
    const { learnerId, activityId } = req.body;

    if (!learnerId) {
      return res.status(400).json({ error: 'learnerId is required' });
    }
    if (!activityId) {
      return res.status(400).json({ error: 'activityId is required' });
    }

    const db = getDatabase();

    // Check learner exists
    const learner = db.prepare('SELECT id FROM learners WHERE id = ?').get(learnerId);
    if (!learner) {
      return res.status(404).json({ error: 'Learner not found' });
    }

    // Check activity exists
    const activity = db.prepare('SELECT id FROM activities WHERE id = ?').get(activityId);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    // Check uniqueness
    const existing = db.prepare(
      'SELECT id FROM assignments WHERE learner_id = ? AND activity_id = ?'
    ).get(learnerId, activityId);
    if (existing) {
      return res.status(409).json({ error: 'This activity is already assigned to this learner.' });
    }

    const result = db.prepare(
      'INSERT INTO assignments (learner_id, activity_id) VALUES (?, ?)'
    ).run(learnerId, activityId);

    const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json({
      id: assignment.id,
      learnerId: assignment.learner_id,
      activityId: assignment.activity_id,
      status: assignment.status,
    });
  } catch (err) {
    console.error('Create assignment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/v1/assignments/:id/status - update assignment status
router.patch('/:id/status', requireAuth, requirePasswordChanged, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Not Started', 'In Progress', 'Completed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const db = getDatabase();
    const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // If Candidate, check ownership
    if (req.session.role === 'Candidate') {
      const learner = db.prepare('SELECT id FROM learners WHERE account_id = ?').get(req.session.userId);
      if (!learner || learner.id !== assignment.learner_id) {
        return res.status(403).json({ error: 'You can only update your own assignments' });
      }
    }

    db.prepare('UPDATE assignments SET status = ? WHERE id = ?').run(status, id);

    const updated = db.prepare('SELECT * FROM assignments WHERE id = ?').get(id);

    return res.status(200).json({
      id: updated.id,
      learnerId: updated.learner_id,
      activityId: updated.activity_id,
      status: updated.status,
    });
  } catch (err) {
    console.error('Update assignment status error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/me/assignments - get current candidate's assignments
router.get('/me', requireAuth, requireCandidate, requirePasswordChanged, (req, res) => {
  try {
    const db = getDatabase();
    const learner = db.prepare('SELECT id FROM learners WHERE account_id = ?').get(req.session.userId);

    if (!learner) {
      return res.status(200).json([]);
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
    `).all(learner.id);

    return res.status(200).json(assignments);
  } catch (err) {
    console.error('Get my assignments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
