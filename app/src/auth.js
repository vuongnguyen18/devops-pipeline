const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { users } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-dont-use-in-prod';

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

async function register(req, res) {
  try {
    const { email, password } = credsSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await users.insert({ email, passwordHash, createdAt: new Date() });
    const token = jwt.sign({ sub: user._id, email }, JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token });
  } catch (e) {
    if (e.errorType === 'uniqueViolated') return res.status(409).json({ error: 'email_taken' });
    return res.status(400).json({ error: 'invalid_credentials' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = credsSchema.parse(req.body);
    const user = await users.findOne({ email });
    if (!user) return res.status(401).json({ error: 'bad_login' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'bad_login' });
    const token = jwt.sign({ sub: user._id, email }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch {
    res.status(400).json({ error: 'invalid_credentials' });
  }
}

function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || '';
  const m = hdr.match(/^Bearer (.+)$/);
  if (!m) return res.status(401).json({ error: 'unauthorized' });
  try {
    const payload = jwt.verify(m[1], JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

module.exports = { register, login, requireAuth };
