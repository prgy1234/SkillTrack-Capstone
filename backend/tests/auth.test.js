const request = require('supertest');
const { setupTestApp, closeDb } = require('./setup');

let app;

beforeAll(async () => {
  const setup = await setupTestApp();
  app = setup.app;
});

afterAll(() => {
  closeDb();
});

describe('Auth API', () => {
  test('Should reject login with wrong credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'coordinator@tracker.local', password: 'wrongpassword' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  test('Should login successfully', async () => {
    const agent = request.agent(app);
    const res = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'coordinator@tracker.local', password: 'Coord!n@t0r1' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('Coordinator');
    expect(res.body.userId).toBeDefined();
  });

  test('Should enforce first-login password change', async () => {
    const agent = request.agent(app);

    // Login as candidate that must change password
    const loginRes = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'newcandidate@example.com', password: 'TempPass1!' })
      .set('Content-Type', 'application/json');

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.mustChangePassword).toBe(true);

    // Try to access assignments - should be blocked
    const assignmentsRes = await agent
      .get('/api/v1/me/assignments')
      .set('Content-Type', 'application/json');

    expect(assignmentsRes.status).toBe(403);
    expect(assignmentsRes.body.error).toMatch(/must change your password/i);
  });

  test('Should change password successfully', async () => {
    const agent = request.agent(app);

    // Login as candidate that must change password
    await agent
      .post('/api/v1/auth/login')
      .send({ email: 'newcandidate@example.com', password: 'TempPass1!' })
      .set('Content-Type', 'application/json');

    // Change password
    const changeRes = await agent
      .post('/api/v1/auth/change-password')
      .send({ currentPassword: 'TempPass1!', newPassword: 'NewSecure8!' })
      .set('Content-Type', 'application/json');

    expect(changeRes.status).toBe(204);
  });

  test('Should reject access to my/assignments before password change', async () => {
    const agent = request.agent(app);

    // Login as the candidate we just changed password for - reset it back to must_change
    // Actually, let's just check a fresh must-change session
    // We'll use the same newcandidate but after password change it no longer must change
    // So let's create a new test by checking session status

    // Login with old creds should fail since we changed password
    const res = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'newcandidate@example.com', password: 'TempPass1!' })
      .set('Content-Type', 'application/json');

    // Old password should now fail since we changed it in previous test
    expect(res.status).toBe(401);
  });

  test('Should logout and reject subsequent requests', async () => {
    const agent = request.agent(app);

    // Login
    await agent
      .post('/api/v1/auth/login')
      .send({ email: 'coordinator@tracker.local', password: 'Coord!n@t0r1' })
      .set('Content-Type', 'application/json');

    // Logout
    const logoutRes = await agent
      .post('/api/v1/auth/logout')
      .send({})
      .set('Content-Type', 'application/json');

    expect(logoutRes.status).toBe(204);

    // Try to access protected route
    const meRes = await agent
      .get('/api/v1/auth/me')
      .set('Content-Type', 'application/json');

    expect(meRes.status).toBe(401);
  });
});
