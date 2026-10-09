import { route } from '../../../lib/api';
import { adminConfigured, isAdmin } from '../../../lib/auth';
import { dbConfigured } from '../../../lib/supabase';

export default route(['GET'], async (req, res) => {
  res.status(200).json({ authenticated: isAdmin(req), configured: adminConfigured(), database: dbConfigured() });
}, { noDb: true });
