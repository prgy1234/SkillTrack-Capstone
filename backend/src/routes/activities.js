const express = require('express');
const { getDatabase } = require('../db/database');
const { requireAuth, requireCoordinator, requirePasswordChanged } = require('../middleware/auth');

const router = express.Router();

// All activity routes are coordinator-only
router.use(requireAuth, requirePasswordChanged, requireCoordinator);

// GET /api/v1/activities - list all activities
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM activities').all();
    const activities = rows.map(r => ({
      id: r.id,
      title: r.title,
      topic: r.topic,
      plannedHours: r.planned_hours,
    }));
    return res.status(200).json(activities);
  } catch (err) {
    console.error('List activities error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/activities - create activity
router.post('/', (req, res) => {
  try {
    const { title, topic, plannedHours } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: 'Topic is required' });
    }
    if (plannedHours === undefined || plannedHours === null || plannedHours <= 0) {
      return res.status(400).json({ error: 'Planned hours must be greater than 0' });
    }

    const db = getDatabase();
    const result = db.prepare(
      'INSERT INTO activities (title, topic, planned_hours) VALUES (?, ?, ?)'
    ).run(title.trim(), topic.trim(), plannedHours);

    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json({
      id: activity.id,
      title: activity.title,
      topic: activity.topic,
      plannedHours: activity.planned_hours,
      planned_hours: activity.planned_hours,
    });
  } catch (err) {
    console.error('Create activity error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/v1/activities/:id - update activity
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, topic, plannedHours } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: 'Topic is required' });
    }
    if (plannedHours === undefined || plannedHours === null || plannedHours <= 0) {
      return res.status(400).json({ error: 'Planned hours must be greater than 0' });
    }

    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM activities WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    db.prepare(
      'UPDATE activities SET title = ?, topic = ?, planned_hours = ? WHERE id = ?'
    ).run(title.trim(), topic.trim(), plannedHours, id);

    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(id);

    return res.status(200).json({
      id: activity.id,
      title: activity.title,
      topic: activity.topic,
      plannedHours: activity.planned_hours,
    });
  } catch (err) {
    console.error('Update activity error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
