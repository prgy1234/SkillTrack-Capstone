const request = require('supertest');
const { setupTestApp, closeDb } = require('./setup');

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

describe('Activities API', () => {
  test('Should reject creating activity without title', async () => {
    const res = await agent
      .post('/api/v1/activities')
      .send({ topic: 'Frontend', plannedHours: 5 })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  test('Should reject creating activity with zero planned hours', async () => {
    const res = await agent
      .post('/api/v1/activities')
      .send({ title: 'Test Activity', topic: 'Frontend', plannedHours: 0 })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/planned hours/i);
  });

  test('Should reject creating activity with negative planned hours', async () => {
    const res = await agent
      .post('/api/v1/activities')
      .send({ title: 'Test Activity', topic: 'Frontend', plannedHours: -5 })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/planned hours/i);
  });

  test('Should create a valid activity', async () => {
    const res = await agent
      .post('/api/v1/activities')
      .send({ title: 'New Activity', topic: 'Backend', plannedHours: 5 })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('New Activity');
    expect(res.body.topic).toBe('Backend');
    expect(res.body.planned_hours).toBe(5);
  });

  test('Should list activities', async () => {
    const res = await agent
      .get('/api/v1/activities')
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(4); // 4 seeded + 1 created
  });
});
