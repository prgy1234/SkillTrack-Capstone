const request = require('supertest');
const { setupTestApp, getDb, closeDb } = require('./setup');

let app;
let agent;

beforeAll(async () => {
  const setup = await setupTestApp();
  app = setup.app;

  // Login as coordinator
  agent = request.agent(app);
  await agent
    .post('/api/v1/auth/login')
    .send({ email: 'coordinator@tracker.local', password: 'Coord!n@t0r1' })
    .set('Content-Type', 'application/json');
});

afterAll(() => {
  closeDb();
});

describe('Assignments API', () => {
  test('Should reject assignment with nonexistent learner', async () => {
    const res = await agent
      .post('/api/v1/assignments')
      .send({ learnerId: 9999, activityId: 1 })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/learner/i);
  });

  test('Should create a valid assignment', async () => {
    const db = getDb();
    const morgan = db.prepare("SELECT id FROM learners WHERE display_name = 'Morgan Chen'").get();
    const sqlActivity = db.prepare("SELECT id FROM activities WHERE title = 'SQL Foundations'").get();

    const res = await agent
      .post('/api/v1/assignments')
      .send({ learnerId: morgan.id, activityId: sqlActivity.id })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.status).toBe('Not Started');
  });

  test('Should reject duplicate assignment (409)', async () => {
    const db = getDb();
    const jordan = db.prepare("SELECT id FROM learners WHERE display_name = 'Jordan Lee'").get();
    const react = db.prepare("SELECT id FROM activities WHERE title = 'React Basics'").get();

    const res = await agent
      .post('/api/v1/assignments')
      .send({ learnerId: jordan.id, activityId: react.id })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already assigned/i);
  });

  test('Should update assignment status', async () => {
    const db = getDb();
    const jordan = db.prepare("SELECT id FROM learners WHERE display_name = 'Jordan Lee'").get();
    const restApi = db.prepare("SELECT id FROM activities WHERE title = 'REST APIs'").get();
    const assignment = db.prepare(
      'SELECT id FROM assignments WHERE learner_id = ? AND activity_id = ?'
    ).get(jordan.id, restApi.id);

    const res = await agent
      .patch(`/api/v1/assignments/${assignment.id}/status`)
      .send({ status: 'In Progress' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('In Progress');
  });
});
