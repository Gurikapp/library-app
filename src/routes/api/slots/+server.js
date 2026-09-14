import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const BOOKS_PATH = 'src/content/books';

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

function base64ToUtf8(b64) {
  const bytes = Uint8Array.from(atob(b64.replace(/\n/g, '')), c => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*"?([^"#]*?)"?\s*(?:#.*)?$/);
    if (m) fm[m[1].trim()] = m[2].trim();
  }
  return fm;
}

export async function GET({ request }) {
  const auth = request.headers.get('authorization') || '';
  if (!verifyToken(auth.replace('Bearer ', ''))) return json({ error: 'Unauthorized' }, { status: 401 });

  const headers = {
    'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  const res = await fetch(
    `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${BOOKS_PATH}`,
    { headers }
  );

  if (!res.ok) return json({ occupied: [], free: [] });
  const files = await res.json();

  const occupied = [];
  await Promise.all(
    files.filter(f => f.name.endsWith('.md')).map(async (f) => {
      const r = await fetch(f.url, { headers });
      const d = await r.json();
      const raw = base64ToUtf8(d.content);
      const fm = parseFrontmatter(raw);
      if (fm.shelf && fm.position) {
        occupied.push({ shelf: parseInt(fm.shelf), position: parseInt(fm.position) });
      }
    })
  );

  const SHELVES = 24;
  const POSITIONS = 11;
  const free = [];
  for (let s = 1; s <= SHELVES; s++) {
    for (let p = 1; p <= POSITIONS; p++) {
      if (!occupied.find(o => o.shelf === s && o.position === p)) {
        free.push({ shelf: s, position: p });
      }
    }
  }

  return json({ occupied, free });
}
