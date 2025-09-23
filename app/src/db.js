// Simple file-backed DB using nedb-promises (no native build toolchain)
const Datastore = require('nedb-promises');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const inMemoryOnly = process.env.TEST_MODE === '1';

const users = Datastore.create({
  filename: path.join(DATA_DIR, 'users.db'),
  autoload: !inMemoryOnly,
  inMemoryOnly
});
users.ensureIndex({ fieldName: 'email', unique: true });

const todos = Datastore.create({
  filename: path.join(DATA_DIR, 'todos.db'),
  autoload: !inMemoryOnly,
  inMemoryOnly
});
todos.ensureIndex({ fieldName: 'ownerId' });

module.exports = { users, todos };
