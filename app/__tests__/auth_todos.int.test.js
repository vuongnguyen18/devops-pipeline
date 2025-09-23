process.env.TEST_MODE = '1'; // in-memory DB for fast tests

const request = require('supertest');
const app = require('../src/app');

async function authAgent() {
  const email = `u${Date.now()}@ex.com`;
  const password = 'secret12';
  const reg = await request(app).post('/auth/register').send({ email, password });
  const token = reg.body.token;
  return (method, url) => request(app)[method](url).set('Authorization', `Bearer ${token}`);
}

describe('auth + todos flow', () => {
  it('creates, lists, updates and deletes todos', async () => {
    const agent = await authAgent();

    // create
    const c = await agent('post', '/todos').send({ text: 'demo' });
    expect(c.status).toBe(201);
    const id = c.body._id;

    // list shows it
    const l1 = await agent('get', '/todos');
    expect(l1.status).toBe(200);
    expect(l1.body.some(t => t._id === id)).toBe(true);

    // update
    const u = await agent('put', `/todos/${id}`).send({ done: true });
    expect(u.status).toBe(200);
    expect(u.body.done).toBe(true);

    // delete
    const d = await agent('delete', `/todos/${id}`);
    expect(d.status).toBe(204);
  });
});
