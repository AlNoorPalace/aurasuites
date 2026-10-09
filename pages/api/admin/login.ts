import { route, parse } from '../../../lib/api';
import { adminConfigured, checkPassword, makeToken, originOk, sessionCookie } from '../../../lib/auth';
import { loginSchema } from '../../../lib/schemas';

export default route(['POST'], async (req, res) => {
  if (!originOk(req)) return res.status(403).json({ error: 'forbidden_origin' });
  if (!adminConfigured()) return res.status(503).json({ error: 'admin_not_configured' });
  const p = parse(loginSchema, req.body, res);
  if (!p) return;
  if (!checkPassword(p.password)) return res.status(401).json({ error: 'wrong_password' });
  res.setHeader('Set-Cookie', sessionCookie(makeToken()));
  res.status(200).json({ ok: true });
}, { noDb: true, limit: ['login', 8, 15 * 60_000] });
