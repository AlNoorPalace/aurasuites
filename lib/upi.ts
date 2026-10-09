const UPI_ID = /^[a-zA-Z0-9.\-_]{1,256}@[a-zA-Z]{2,64}$/;

export function upiConfig() {
  return {
    id: process.env.NEXT_PUBLIC_UPI_ID || '',
    name: process.env.NEXT_PUBLIC_UPI_NAME || 'Aura Suites',
  };
}

/** Builds a upi://pay link, or null when the id or amount is not usable. */
export function buildUpiLink(opts: { id: string; name: string; amount: number; reference: string }): string | null {
  const { id, name, amount, reference } = opts;
  if (!UPI_ID.test(id)) return null;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return null;
  const ref = String(reference).replace(/[^A-Za-z0-9 \-]/g, '').trim();
  const cleanName = String(name).replace(/[\r\n]/g, ' ').trim() || 'Aura Suites';
  const enc = encodeURIComponent;
  return `upi://pay?pa=${enc(id)}&pn=${enc(cleanName)}&am=${amount.toFixed(2)}&cu=INR&tn=${enc(`Booking ${ref}`)}`;
}

export const MIN_ADVANCE = 500;

/** Advance must be at least ₹500 (or the whole balance if that is smaller) and no more than the balance. */
export function advanceBounds(balance: number): { min: number; max: number } {
  const max = Math.max(0, Math.floor(balance));
  return { min: Math.min(MIN_ADVANCE, max), max };
}

export function validAdvance(amount: number, balance: number): boolean {
  const { min, max } = advanceBounds(balance);
  return Number.isFinite(amount) && Number.isInteger(amount) && max > 0 && amount >= min && amount <= max;
}
