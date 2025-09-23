const express = require('express');
const rateLimit = require('express-rate-limit');
const client = require('prom-client');
const { register: regUser, login, requireAuth } = require('./auth');
const routes = require('./routes');

const app = express();
app.use(express.json());
app.use(rateLimit({ windowMs: 60_000, max: 120 })); // simple abuse guard

// Metrics registry
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// HTTP counter (kept)
const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status']
});
register.registerMetric(httpRequests);

// Business metric: todos created
const todosCreated = new client.Counter({
  name: 'todos_created_total',
  help: 'Number of todos created'
});
register.registerMetric(todosCreated);

// Latency histogram (useful for alerts)
const httpLatency = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Request duration',
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2],
  labelNames: ['path', 'method', 'status']
});
register.registerMetric(httpLatency);

// per-request metrics
app.use((req, res, next) => {
  const end = httpLatency.startTimer({ path: req.path, method: req.method });
  res.on('finish', () => {
    const labels = { method: req.method, path: req.path, status: res.statusCode };
    httpRequests.inc(labels);
    end({ status: res.statusCode });
  });
  next();
});

// Health + error + metrics (existing)
app.get('/health', (req, res) => res.status(200).send('ok'));
app.get('/error', (req, res) => res.status(500).send('boom'));
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Auth
app.post('/auth/register', regUser);
app.post('/auth/login', login);

// Protected CRUD
app.use(requireAuth, routes({ todosCreated }));

module.exports = app;
