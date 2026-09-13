require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const slugify = require('slugify');

const app = express();
const port = Number(process.env.API_PORT || 4000);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 40 }));
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const tokenFor = user => jwt.sign({ id: user.id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: '2h' });
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  try { req.user = jwt.verify(header.startsWith('Bearer ') ? header.slice(7) : '', process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Authentication required' }); }
}
const clean = value => String(value || '').trim();

app.get('/api/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1'); res.json({ status: 'ok', database: 'connected' });
}));
app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const name = clean(req.body.name), email = clean(req.body.email).toLowerCase(), password = String(req.body.password || '');
  if (!name || !email.includes('@') || password.length < 8) return res.status(400).json({ error: 'Name, valid email, and 8+ character password are required' });
  const hash = await bcrypt.hash(password, 12);
  try {
    const { rows } = await pool.query('INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,name,email', [name, email, hash]);
    res.status(201).json({ user: rows[0], token: tokenFor(rows[0]) });
  } catch (e) { if (e.code === '23505') return res.status(409).json({ error: 'Email already registered' }); throw e; }
}));
app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const email = clean(req.body.email).toLowerCase(), password = String(req.body.password || '');
  const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
  if (!rows[0] || !(await bcrypt.compare(password, rows[0].password_hash))) return res.status(401).json({ error: 'Invalid credentials' });
  const { password_hash, ...user } = rows[0]; res.json({ user, token: tokenFor(user) });
}));
app.get('/api/categories', asyncRoute(async (_req, res) => res.json((await pool.query('SELECT * FROM categories ORDER BY name')).rows)));
app.post('/api/categories', auth, asyncRoute(async (req, res) => {
  const name = clean(req.body.name);
  if (!name) return res.status(400).json({ error: 'Category name is required' });
  try {
    const { rows } = await pool.query('INSERT INTO categories(name,slug) VALUES($1,$2) RETURNING *', [name, slugify(name, { lower: true, strict: true })]);
    res.status(201).json(rows[0]);
  } catch (e) { if (e.code === '23505') return res.status(409).json({ error: 'Category already exists' }); throw e; }
}));
app.put('/api/categories/:id', auth, asyncRoute(async (req, res) => {
  const name = clean(req.body.name);
  if (!name) return res.status(400).json({ error: 'Category name is required' });
  const { rows } = await pool.query('UPDATE categories SET name=$1,slug=$2 WHERE id=$3 RETURNING *', [name, slugify(name, { lower: true, strict: true }), req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Category not found' }); res.json(rows[0]);
}));
app.delete('/api/categories/:id', auth, asyncRoute(async (req, res) => {
  const result = await pool.query('DELETE FROM categories WHERE id=$1', [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Category not found' }); res.status(204).end();
}));
app.get('/api/posts', asyncRoute(async (req, res) => {
  const values = [], filters = ['p.published = true'];
  if (req.query.category) { values.push(req.query.category); filters.push(`c.slug=$${values.length}`); }
  const q = `SELECT p.*, u.name author, c.name category, c.slug category_slug FROM posts p JOIN users u ON u.id=p.author_id LEFT JOIN categories c ON c.id=p.category_id WHERE ${filters.join(' AND ')} ORDER BY p.created_at DESC`;
  res.json((await pool.query(q, values)).rows);
}));
app.get('/api/posts/:slug', asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT p.*,u.name author,c.name category,c.slug category_slug FROM posts p JOIN users u ON u.id=p.author_id LEFT JOIN categories c ON c.id=p.category_id WHERE p.slug=$1', [req.params.slug]);
  if (!rows[0]) return res.status(404).json({ error: 'Post not found' });
  const comments = (await pool.query('SELECT c.*,u.name author FROM comments c JOIN users u ON u.id=c.user_id WHERE post_id=$1 ORDER BY c.created_at', [rows[0].id])).rows;
  res.json({ ...rows[0], comments });
}));
app.post('/api/posts', auth, asyncRoute(async (req, res) => {
  const title=clean(req.body.title), content=clean(req.body.content), categoryId=req.body.categoryId || null;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
  const slug = `${slugify(title,{lower:true,strict:true})}-${Date.now().toString(36)}`;
  const { rows } = await pool.query('INSERT INTO posts(title,slug,excerpt,content,author_id,category_id,published) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *', [title,slug,clean(req.body.excerpt),content,req.user.id,categoryId,req.body.published !== false]);
  res.status(201).json(rows[0]);
}));
app.put('/api/posts/:id', auth, asyncRoute(async (req, res) => {
  const { rows } = await pool.query('UPDATE posts SET title=COALESCE(NULLIF($1,\'\'),title), excerpt=COALESCE($2,excerpt), content=COALESCE(NULLIF($3,\'\'),content), category_id=$4, published=COALESCE($5,published), updated_at=now() WHERE id=$6 AND author_id=$7 RETURNING *', [req.body.title, req.body.excerpt, req.body.content, req.body.categoryId || null, req.body.published, req.params.id, req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Post not found' }); res.json(rows[0]);
}));
app.delete('/api/posts/:id', auth, asyncRoute(async (req,res) => { const r=await pool.query('DELETE FROM posts WHERE id=$1 AND author_id=$2',[req.params.id,req.user.id]); if(!r.rowCount)return res.status(404).json({error:'Post not found'}); res.status(204).end(); }));
app.post('/api/posts/:id/comments', auth, asyncRoute(async (req,res) => { const body=clean(req.body.body); if(!body)return res.status(400).json({error:'Comment cannot be empty'}); const {rows}=await pool.query('INSERT INTO comments(post_id,user_id,body) VALUES($1,$2,$3) RETURNING *',[req.params.id,req.user.id,body]); res.status(201).json({...rows[0],author:req.user.name}); }));
app.delete('/api/comments/:id', auth, asyncRoute(async (req,res) => { const r=await pool.query('DELETE FROM comments WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id]); if(!r.rowCount)return res.status(404).json({error:'Comment not found'}); res.status(204).end(); }));
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Internal server error' }); });
if (require.main === module) app.listen(port, () => console.log(`API listening on ${port}`));
module.exports = app;
