import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const BOOKS_PATH = 'src/content/books';
const GITHUB_API = 'https://api.github.com';

function verifyToken(token) {
  try {
    const secret = env.JWT_SECRET || 'fallback-secret';
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const expectedSig = btoa(`${parts[0]}.${parts[1]}.${secret}`).replace(/[+/=]/g, c => ({'+':`-`,'/':'_','=':''}[c]));
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

function githubHeaders() {
  return {
    'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json'
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

export async function GET({ request }) {
  if (!checkAuth(request)) return json({ error: 'Unauthorized' }, { status: 401 });
  if (!env.GITHUB_TOKEN) return json({ error: 'GITHUB_TOKEN не задан' }, { status: 500 });

  const res = await fetch(
    `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${BOOKS_PATH}`,
    { headers: githubHeaders() }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return json({ error: `GitHub error: ${err.message || res.status}` }, { status: 500 });
  }

  const files = await res.json();

  const books = await Promise.all(
    files
      .filter(f => f.name.endsWith('.md'))
      .map(async (f) => {
        const fileRes = await fetch(f.url, { headers: githubHeaders() });
        const fileData = await fileRes.json();
        const content = base64ToUtf8(fileData.content);
        return { name: f.name, sha: fileData.sha, path: f.path, rawContent: content };
      })
  );

  return json(books);
}

export async function POST({ request }) {
  if (!checkAuth(request)) return json({ error: 'Unauthorized' }, { status: 401 });

  const { filename, content } = await request.json();
  if (!filename || !content) return json({ error: 'Не хватает полей' }, { status: 400 });

  const safeName = filename.endsWith('.md') ? filename : filename + '.md';
  const encoded = utf8ToBase64(content);
  const filePath = `${BOOKS_PATH}/${safeName}`;

  const res = await fetch(
    `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodeURIComponent(filePath)}`,
    {
      method: 'PUT',
      headers: githubHeaders(),
      body: JSON.stringify({ message: `Add book: ${safeName}`, content: encoded })
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return json({ error: err.message || 'Ошибка GitHub' }, { status: 500 });
  }
  return json({ ok: true });
}

export async function PUT({ request }) {
  if (!checkAuth(request)) return json({ error: 'Unauthorized' }, { status: 401 });

  const { path, sha, content, filename } = await request.json();
  if (!path || !sha || !content) return json({ error: 'Не хватает полей' }, { status: 400 });

  const encoded = utf8ToBase64(content);

  const res = await fetch(
    `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodeURIComponent(path)}`,
    {
      method: 'PUT',
      headers: githubHeaders(),
      body: JSON.stringify({ message: `Update book: ${filename || path}`, content: encoded, sha })
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return json({ error: err.message || 'Ошибка GitHub' }, { status: 500 });
  }
  return json({ ok: true });
}

export async function DELETE({ request }) {
  if (!checkAuth(request)) return json({ error: 'Unauthorized' }, { status: 401 });

  const { path, sha, filename } = await request.json();
  if (!path || !sha) return json({ error: 'Не хватает полей' }, { status: 400 });

  const res = await fetch(
    `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodeURIComponent(path)}`,
    {
      method: 'DELETE',
      headers: githubHeaders(),
      body: JSON.stringify({ message: `Delete book: ${filename || path}`, sha })
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return json({ error: err.message || 'Ошибка GitHub' }, { status: 500 });
  }
  return json({ ok: true });
}
