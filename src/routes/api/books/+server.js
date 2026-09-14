import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import fs from 'fs';
import path from 'path';

const BOOKS_PATH = 'src/content/books';
const GITHUB_API = 'https://api.github.com';

function verifyToken(token) {
  try {
    const secret = env.JWT_SECRET || 'fallback-secret';
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const expectedSig = btoa(`${parts[0]}.${parts[1]}.${secret}`).replace(/[+/=]/g, c => ({ '+': '-', '/': '_', '=': '' }[c]));
    if (parts[2] !== expectedSig) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
}

function checkAuth(request) {
  const auth = request.headers.get('authorization') || '';
  return verifyToken(auth.replace('Bearer ', ''));
}

function gh(extra = {}) {
  return {
    'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    ...extra
  };
}

function base64ToUtf8(b64) {
  const bytes = Uint8Array.from(atob(b64.replace(/\n/g, '')), c => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary);
}

// ── Локальный режим (для разработки без GitHub) ──────────────────────────────

function getBooksFromDisk() {
  const dir = path.resolve(BOOKS_PATH);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(name => {
      const rawContent = fs.readFileSync(path.join(dir, name), 'utf-8');
      const sha = Buffer.from(name).toString('base64').slice(0, 40);
      return { name, sha, path: `${BOOKS_PATH}/${name}`, rawContent };
    });
}

const isLocal = !env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO;

// ── GET: список книг ─────────────────────────────────────────────────────────
// Использует Git Trees API + Blob API — всего 2 запроса вместо N+1

export async function GET({ request }) {
  if (!checkAuth(request)) return json({ error: 'Unauthorized' }, { status: 401 });

  if (isLocal) return json(getBooksFromDisk());

  const repo = `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}`;

  // 1. Получаем SHA последнего коммита в default branch
  const branchRes = await fetch(`${repo}/git/ref/heads/main`, { headers: gh() });
  const branchData = await branchRes.json();

  // Пробуем master если main не найден
  let commitSha = branchData?.object?.sha;
  if (!commitSha) {
    const masterRes = await fetch(`${repo}/git/ref/heads/master`, { headers: gh() });
    const masterData = await masterRes.json();
    commitSha = masterData?.object?.sha;
  }
  if (!commitSha) return json({ error: 'Не удалось получить ветку репозитория' }, { status: 500 });

  // 2. Получаем дерево файлов рекурсивно — ОДИН запрос
  const treeRes = await fetch(`${repo}/git/trees/${commitSha}?recursive=1`, { headers: gh() });
  if (!treeRes.ok) return json({ error: 'Ошибка получения файлов из GitHub' }, { status: 500 });
  const treeData = await treeRes.json();

  // Фильтруем только .md файлы в нужной папке
  const mdFiles = (treeData.tree || []).filter(
    item => item.type === 'blob' && item.path.startsWith(BOOKS_PATH) && item.path.endsWith('.md')
  );

  if (mdFiles.length === 0) return json([]);

  // 3. Загружаем содержимое каждого файла через Blob API параллельно
  // Это всё ещё N запросов, но без промежуточного listing-запроса
  // и GitHub не считает blob-запросы так агрессивно
  const books = await Promise.all(
    mdFiles.map(async (file) => {
      const blobRes = await fetch(`${repo}/git/blobs/${file.sha}`, { headers: gh() });
      if (!blobRes.ok) return null;
      const blob = await blobRes.json();
      const rawContent = base64ToUtf8(blob.content);
      const name = file.path.split('/').pop();
      return { name, sha: file.sha, path: file.path, rawContent };
    })
  );

  return json(books.filter(Boolean));
}

// ── POST: создать книгу ───────────────────────────────────────────────────────

export async function POST({ request }) {
  if (!checkAuth(request)) return json({ error: 'Unauthorized' }, { status: 401 });

  const { filename, content } = await request.json();
  if (!filename || !content) return json({ error: 'Не хватает полей' }, { status: 400 });

  if (isLocal) {
    const safeName = filename.endsWith('.md') ? filename : filename + '.md';
    const dir = path.resolve(BOOKS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, safeName), content, 'utf-8');
    return json({ ok: true });
  }

  const safeName = filename.endsWith('.md') ? filename : filename + '.md';
  const filePath = `${BOOKS_PATH}/${safeName}`;
  const res = await fetch(
    `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodeURIComponent(filePath)}`,
    {
      method: 'PUT',
      headers: gh(),
      body: JSON.stringify({ message: `Add book: ${safeName}`, content: utf8ToBase64(content) })
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return json({ error: err.message || 'Ошибка GitHub' }, { status: 500 });
  }
  return json({ ok: true });
}

// ── PUT: обновить книгу ───────────────────────────────────────────────────────

export async function PUT({ request }) {
  if (!checkAuth(request)) return json({ error: 'Unauthorized' }, { status: 401 });

  const { path: bookPath, sha, content, filename } = await request.json();
  if (!bookPath || !content) return json({ error: 'Не хватает полей' }, { status: 400 });

  if (isLocal) {
    fs.writeFileSync(path.resolve(bookPath), content, 'utf-8');
    return json({ ok: true });
  }

  if (!sha) return json({ error: 'Не хватает sha' }, { status: 400 });

  // Нужен актуальный SHA файла — blob SHA из дерева отличается от contents SHA
  // Получаем его через contents API перед обновлением
  const getRes = await fetch(
    `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodeURIComponent(bookPath)}`,
    { headers: gh() }
  );
  const fileInfo = await getRes.json().catch(() => ({}));
  const currentSha = fileInfo.sha || sha;

  const res = await fetch(
    `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodeURIComponent(bookPath)}`,
    {
      method: 'PUT',
      headers: gh(),
      body: JSON.stringify({
        message: `Update book: ${filename || bookPath}`,
        content: utf8ToBase64(content),
        sha: currentSha
      })
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return json({ error: err.message || 'Ошибка GitHub' }, { status: 500 });
  }
  return json({ ok: true });
}

// ── DELETE: удалить книгу ─────────────────────────────────────────────────────

export async function DELETE({ request }) {
  if (!checkAuth(request)) return json({ error: 'Unauthorized' }, { status: 401 });

  const { path: bookPath, sha, filename } = await request.json();
  if (!bookPath) return json({ error: 'Не хватает полей' }, { status: 400 });

  if (isLocal) {
    const p = path.resolve(bookPath);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    return json({ ok: true });
  }

  if (!sha) return json({ error: 'Не хватает sha' }, { status: 400 });

  // Получаем актуальный SHA перед удалением
  const getRes = await fetch(
    `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodeURIComponent(bookPath)}`,
    { headers: gh() }
  );
  const fileInfo = await getRes.json().catch(() => ({}));
  const currentSha = fileInfo.sha || sha;

  const res = await fetch(
    `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodeURIComponent(bookPath)}`,
    {
      method: 'DELETE',
      headers: gh(),
      body: JSON.stringify({ message: `Delete book: ${filename || bookPath}`, sha: currentSha })
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return json({ error: err.message || 'Ошибка GitHub' }, { status: 500 });
  }
  return json({ ok: true });
}
