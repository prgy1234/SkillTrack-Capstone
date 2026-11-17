const request = require('supertest');
const { setupTestApp, closeDb } = require('./setup');

let app;
let coordinator;

beforeAll(async () => {
  const setup = await setupTestApp();
  app = setup.app;
  coordinator = request.agent(app);
  await coordinator.post('/api/v1/auth/login')
    .send({ email: 'coordinator@tracker.local', password: 'Coord!n@t0r1' })
    .set('Content-Type', 'application/json');
});

afterAll(() => closeDb());

describe('Dashboard and candidate account improvements', () => {
  test('returns programme totals and individual learner progress', async () => {
    const response = await coordinator.get('/api/v1/cohort-summary');
    expect(response.status).toBe(200);
    expect(response.body.learnerCount).toBe(4);
    expect(response.body.activityCount).toBe(4);
    expect(response.body.completedCount).toBe(1);
    expect(response.body.pendingCount).toBe(2);
    expect(response.body.overallCompletion).toBe(33);
    expect(response.body.learners.find((learner) => learner.displayName === 'Jordan Lee').completionPercentage).toBe(33);
  });

  test('allows a candidate to self-register and stores their learner name', async () => {
    const response = await request(app).post('/api/v1/auth/signup')
      .send({ name: 'Taylor Singh', email: 'taylor@example.com', cohort: 'Full Stack', password: 'TaylorPass1!' })
      .set('Content-Type', 'application/json');
    expect(response.status).toBe(201);
    const login = await request.agent(app).post('/api/v1/auth/login')
      .send({ email: 'taylor@example.com', password: 'TaylorPass1!' })
      .set('Content-Type', 'application/json');
    expect(login.status).toBe(200);
    expect(login.body.displayName).toBe('Taylor Singh');
    expect(login.body.cohort).toBe('Full Stack');
  });

  test('coordinator can delete a learner and their account', async () => {
    const list = await coordinator.get('/api/v1/learners');
    const learner = list.body.find((item) => item.email === 'casey.rivera@example.com');
    const response = await coordinator.delete(`/api/v1/learners/${learner.id}`)
      .set('Content-Type', 'application/json');
    expect(response.status).toBe(204);
    const refreshed = await coordinator.get('/api/v1/learners');
    expect(refreshed.body.some((item) => item.id === learner.id)).toBe(false);
  });
});
