import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

function signToken(payload) {
  const secret = env.JWT_SECRET || 'fallback-secret';
  const header = btoa(JSON.stringify({ alg: 'simple', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const sig = btoa(`${header}.${body}.${secret}`).replace(/[+/=]/g, c => ({'+':`-`,'/':'_','=':''}[c]));
  return `${header}.${body}.${sig}`;
}

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

export async function POST({ request }) {
  const { password } = await request.json();
  const adminPassword = env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return json({ error: 'Сервер не настроен: переменная ADMIN_PASSWORD не задана' }, { status: 500 });
  }

  if (password !== adminPassword) {
    return json({ error: 'Неверный пароль' }, { status: 401 });
  }

  const token = signToken({ role: 'admin', exp: Date.now() + 24 * 60 * 60 * 1000 });
  return json({ token });
}

export async function GET({ request }) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.replace('Bearer ', '');
  const payload = verifyToken(token);
  if (!payload) return json({ valid: false }, { status: 401 });
  return json({ valid: true });
}
