// 稍后阅读 · 服务入口
// 核心 API：POST /api/bookmarks · PATCH /api/bookmarks/:id/read · DELETE /api/bookmarks/:id
// PWA Web Share Target：GET /share-target?title=&text=&url=
const express = require('express');
const path = require('path');
const db = require('./db');
const { fetchTitle } = require('./lib/fetch-title');
const { extractUrl, hostOf } = require('./lib/url-utils');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/+$/, '');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
}));

const FILTERS = ['all', 'unread', 'read'];

/**
 * 保存一条链接：提取 URL → 抓标题 → 落库。
 * 标题优先级：调用方给的 title > 抓取到的标题 > URL 本身。
 */
async function saveBookmark(rawUrl, rawTitle, source) {
  const url = extractUrl(rawUrl);
  if (!url) {
    return { error: '无效的链接：只支持 http/https，且必须包含完整地址' };
  }
  const fetched = await fetchTitle(url);
  const title = (rawTitle && rawTitle.trim()) || fetched || url;
  const bookmark = db.create({ url, title, source: source || 'manual' });
  return { bookmark, titleFetched: !!fetched };
}

function renderList(res, filter) {
  const safeFilter = FILTERS.includes(filter) ? filter : 'all';
  const items = db.getAll(safeFilter).map((it) => ({ ...it, host: hostOf(it.url) }));
  res.render('index', { items, filter: safeFilter, counts: db.counts(), baseUrl: BASE_URL });
}

// ---------- 页面 ----------

// 列表页
app.get('/', (req, res) => {
  renderList(res, req.query.filter);
});

// PWA Web Share Target：手机分享菜单 → 此处
app.get('/share-target', async (req, res) => {
  const { url, text, title } = req.query;
  const result = await saveBookmark(url || text, title, 'share');
  if (result.error) {
    return res.status(400).render('error', { message: result.error, baseUrl: BASE_URL });
  }
  res.render('saved', { bookmark: { ...result.bookmark, host: hostOf(result.bookmark.url) }, baseUrl: BASE_URL });
});

// 手动添加（无 JS 时的表单回退）
app.post('/bookmarks', async (req, res) => {
  const result = await saveBookmark(req.body.url, req.body.title, 'manual');
  if (result.error) {
    return res.status(400).render('error', { message: result.error, baseUrl: BASE_URL });
  }
  res.redirect('/');
});

// ---------- API ----------

// 保存链接（手机分享、书签工具、命令行都走这里）
app.post('/api/bookmarks', async (req, res) => {
  const result = await saveBookmark(req.body.url, req.body.title, req.body.source || 'api');
  if (result.error) return res.status(400).json({ error: result.error });
  res.status(201).json(result.bookmark);
});

// 标记已读 / 未读（body: { isRead?: boolean }，缺省为 true）
app.patch('/api/bookmarks/:id/read', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: '无效的 id' });
  const isRead = req.body?.isRead === undefined ? true : !!req.body.isRead;
  if (!db.setRead(id, isRead)) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true, id, isRead });
});

// 删除
app.delete('/api/bookmarks/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: '无效的 id' });
  if (!db.remove(id)) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true, id });
});

// 统计（前端刷新 tab 数字用）
app.get('/api/stats', (req, res) => {
  res.json(db.counts());
});

// 健康检查
app.get('/healthz', (req, res) => res.json({ ok: true, baseUrl: BASE_URL }));

app.listen(PORT, () => {
  console.log(`📚 稍后阅读已启动：${BASE_URL}`);
  console.log(`   手机保存：先把本页“添加到主屏幕”，再在任意网页的分享菜单里选「稍后阅读」`);
});
