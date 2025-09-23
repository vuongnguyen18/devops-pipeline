const { Router } = require('express');
const { z } = require('zod');
const { todos } = require('./db');

const todoSchema = z.object({ text: z.string().min(1), done: z.boolean().optional() });

module.exports = function routes(metrics) {
  const r = Router();

  r.get('/todos', async (req, res) => {
    const list = await todos.find({ ownerId: req.user.id }).sort({ createdAt: -1 });
    res.json(list);
  });

  r.post('/todos', async (req, res) => {
    const { text } = todoSchema.parse(req.body);
    const doc = await todos.insert({ ownerId: req.user.id, text, done: false, createdAt: new Date() });
    metrics.todosCreated.inc();
    res.status(201).json(doc);
  });

  r.put('/todos/:id', async (req, res) => {
    const patch = todoSchema.partial().parse(req.body);
    const updated = await todos.update({ _id: req.params.id, ownerId: req.user.id }, { $set: patch }, { returnUpdatedDocs: true });
    if (!updated) return res.status(404).json({ error: 'not_found' });
    res.json(updated);
  });

  r.delete('/todos/:id', async (req, res) => {
    const n = await todos.remove({ _id: req.params.id, ownerId: req.user.id }, {});
    if (!n) return res.status(404).json({ error: 'not_found' });
    res.status(204).end();
  });

  return r;
};
