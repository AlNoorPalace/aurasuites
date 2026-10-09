export const rupees = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parseIso = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const nightsBetween = (a: string, b: string) => Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / 86400000);
export const prettyDate = (s: string) => parseIso(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export const addDays = (s: string, n: number) => { const d = parseIso(s); d.setDate(d.getDate() + n); return iso(d); };
export const today = () => iso(new Date());

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string; fields?: Record<string, string>; message?: string };

export async function api<T = any>(url: string, init?: { method?: string; body?: unknown }): Promise<ApiResult<T>> {
  try {
    const r = await fetch(url, {
      method: init?.method || 'GET',
      headers: init?.body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: 'same-origin',
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok) return { ok: true, data: j as T };
    return { ok: false, status: r.status, error: j.error || 'server_error', fields: j.fields, message: j.message };
  } catch {
    return { ok: false, status: 0, error: 'network' };
  }
}

const MESSAGES: Record<string, string> = {
  sold_out: 'Sorry, those rooms were just taken. Please pick other dates or another room.',
  too_many_guests: 'That room is too small for your party.',
  invalid_dates: 'Please check your dates.',
  not_found: 'We could not find that. Please check the details.',
  already_cancelled: 'This booking is already cancelled.',
  too_late: 'This stay has already started, so it can no longer be cancelled online. Please call the hotel.',
  rate_limited: 'Too many attempts. Please wait a few minutes and try again.',
  unavailable: 'Booking is temporarily unavailable. Please call us or email your request.',
  network: 'Could not reach the server. Check your connection and try again.',
  has_bookings: 'This has bookings, so it cannot be deleted. Hide it or switch it off instead.',
  slug_taken: 'That URL name is already used.',
  name_taken: 'A room with that name already exists here.',
  unauthorized: 'Please sign in again.',
};
export const friendly = (e: { error: string; message?: string }) => e.message || MESSAGES[e.error] || 'Something went wrong. Please try again.';
