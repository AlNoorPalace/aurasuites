import { route } from '../../../lib/api';
import { originOk, sessionCookie } from '../../../lib/auth';

export default route(['POST'], async (req, res) => {
  if (!originOk(req)) return res.status(403).json({ error: 'forbidden_origin' });
  res.setHeader('Set-Cookie', sessionCookie(null));
  res.status(200).json({ ok: true });
}, { noDb: true });
