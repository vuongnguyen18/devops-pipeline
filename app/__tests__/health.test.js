const request = require('supertest');
const app = require('../src/app');

describe('health endpoint', () => {
  it('returns 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
  });
});
