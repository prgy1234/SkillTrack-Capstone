const express = require('express');
const { getDatabase } = require('../db/database');
const { requireAuth, requireCoordinator, requirePasswordChanged } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, requirePasswordChanged, requireCoordinator, (req, res) => {
  try {
    const db = getDatabase();
    const learnerCount = db.prepare('SELECT COUNT(*) AS count FROM learners').get().count;
    const activityCount = db.prepare('SELECT COUNT(*) AS count FROM activities').get().count;
    const assignmentCount = db.prepare('SELECT COUNT(*) AS count FROM assignments').get().count;
    const completedCount = db.prepare("SELECT COUNT(*) AS count FROM assignments WHERE status = 'Completed'").get().count;
    const pendingCount = assignmentCount - completedCount;
    const overallCompletion = assignmentCount ? Math.round((completedCount / assignmentCount) * 100) : 0;

    const learners = db.prepare(`
      SELECT l.id, l.display_name AS displayName, l.cohort, a.email,
        COUNT(asgn.id) AS totalActivities,
        SUM(CASE WHEN asgn.status = 'Completed' THEN 1 ELSE 0 END) AS completedActivities,
        SUM(CASE WHEN asgn.status IS NOT NULL AND asgn.status != 'Completed' THEN 1 ELSE 0 END) AS pendingActivities,
        CASE WHEN COUNT(asgn.id) = 0 THEN 0
          ELSE ROUND(100.0 * SUM(CASE WHEN asgn.status = 'Completed' THEN 1 ELSE 0 END) / COUNT(asgn.id)) END AS completionPercentage
      FROM learners l
      LEFT JOIN accounts a ON a.id = l.account_id
      LEFT JOIN assignments asgn ON asgn.learner_id = l.id
      GROUP BY l.id
      ORDER BY l.display_name COLLATE NOCASE
    `).all();

    const activityFilter = req.query.activityId ? Number(req.query.activityId) : null;
    const learnerFilter = req.query.learnerId ? Number(req.query.learnerId) : null;
    let reportRows = learners;
    if (learnerFilter) reportRows = reportRows.filter((row) => row.id === learnerFilter);
    if (activityFilter) {
      reportRows = db.prepare(`
        SELECT l.id, l.display_name AS displayName, l.cohort, a.email,
          COUNT(asgn.id) AS totalActivities,
          SUM(CASE WHEN asgn.status = 'Completed' THEN 1 ELSE 0 END) AS completedActivities,
          SUM(CASE WHEN asgn.status != 'Completed' THEN 1 ELSE 0 END) AS pendingActivities,
          CASE WHEN COUNT(asgn.id) = 0 THEN 0
            ELSE ROUND(100.0 * SUM(CASE WHEN asgn.status = 'Completed' THEN 1 ELSE 0 END) / COUNT(asgn.id)) END AS completionPercentage
        FROM learners l
        LEFT JOIN accounts a ON a.id = l.account_id
        LEFT JOIN assignments asgn ON asgn.learner_id = l.id AND asgn.activity_id = ?
        GROUP BY l.id ORDER BY l.display_name COLLATE NOCASE
      `).all(activityFilter);
      if (learnerFilter) reportRows = reportRows.filter((row) => row.id === learnerFilter);
    }

    return res.status(200).json({
      learnerCount, activityCount, assignmentCount, completedCount, pendingCount,
      overallCompletion, learners: reportRows, learnerOptions: learners.map(({ id, displayName }) => ({ id, displayName })),
    });
  } catch (err) {
    console.error('Cohort summary error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
