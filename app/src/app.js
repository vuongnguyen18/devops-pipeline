const express = require('express');
const client = require('prom-client');

const app = express();
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Simple HTTP request counter
const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status']
});
register.registerMetric(httpRequests);

// Middleware to count requests
app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequests.inc({ method: req.method, path: req.path, status: res.statusCode });
  });
  next();
});

app.get('/health', (req, res) => res.status(200).send('ok'));
app.get('/error', (req, res) => res.status(500).send('boom'));
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

module.exports = app;
