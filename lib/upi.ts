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
